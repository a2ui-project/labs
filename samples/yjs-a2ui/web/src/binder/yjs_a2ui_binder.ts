/*
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {A2uiRendererService} from '@a2ui/angular';
import {type DataModel, type Subscription, type SurfaceModel} from '@a2ui/web_core/v0_9';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as yjs from 'yjs';

import {
  cloneJsonValue,
  computeStringEditDiff,
  escapePointerSegment,
  isJsonObject,
  type JsonArray,
  jsonEquals,
  type JsonObject,
  type JsonValue,
  normalizePointer,
  parsePointerSegments,
  type YDataValue,
  yValueToJson,
} from './json_types';

const LOCAL_BINDER_ORIGIN = 'yjs-a2ui-local-binder';
const ROOT_META_KEY = 'meta';
const ROOT_COMPONENTS_KEY = 'components';
const ROOT_COMPONENT_ORDER_KEY = 'componentOrder';
const ROOT_DATA_KEY = 'data';

const PALETTE = ['#0b57d0', '#137333', '#b06000', '#c5221f', '#7627bb', '#007b83'];

/** Deterministic color assignment for a collaborator ID. */
export function colorForActor(actorId: string): string {
  let sum = 0;
  for (let i = 0; i < actorId.length; i++) {
    sum = (sum + actorId.charCodeAt(i)) % 9973;
  }
  return PALETTE[sum % PALETTE.length];
}

/** Collaborator identity and field-level focus projected from `y-protocols/awareness`. */
export interface PeerPresence {
  readonly clientId: number;
  readonly actorId: string;
  readonly displayName: string;
  readonly color: string;
  readonly isLocal: boolean;
  readonly focusedComponentId: string;
  readonly focusedPath: string;
  readonly focusedLabel: string;
  readonly updatedAt: number;
}

/** Metadata about an interactive bound component on the active A2UI surface. */
export interface BoundControlDescriptor {
  readonly componentId: string;
  readonly componentType: string;
  readonly label: string;
  readonly boundPath: string;
  readonly crdtKind: 'Y.Text' | 'Y.Array' | 'Y.Map(LWW)' | 'LocalOnly';
}

/** Entry displayed in the live CRDT Inspector tree. */
export interface InspectedCrdtNode {
  readonly path: string;
  readonly crdtType: 'Y.Text' | 'Y.Map' | 'Y.Array' | 'Y.Map(LWW)';
  readonly preview: string;
}

/** Snapshot emitted whenever the binder reconciles Yjs state or Awareness. */
export interface BinderSnapshot {
  readonly surfaceId: string;
  readonly title: string;
  readonly componentCount: number;
  readonly peers: readonly PeerPresence[];
  readonly controls: readonly BoundControlDescriptor[];
  readonly crdtNodes: readonly InspectedCrdtNode[];
  readonly usersData: JsonObject;
}

/** Options configuring `YjsA2uiBinder`. */
export interface YjsA2uiBinderOptions {
  readonly doc: yjs.Doc;
  readonly awareness: awarenessProtocol.Awareness;
  readonly renderer: A2uiRendererService;
  readonly actorId: string;
  readonly displayName: string;
  readonly color?: string;
  readonly onSnapshotChange?: (snapshot: BinderSnapshot) => void;
  readonly onBeforeSurfaceSync?: () => void;
  readonly onAfterSurfaceSync?: () => void;
}

/**
 * Bidirectional adapter binding an unmodified `@a2ui/angular` v1.0 surface
 * (`A2uiRendererService` / `SurfaceModel` / `DataModel`) to a `yjs.Doc` and
 * `y-protocols/awareness` instance.
 */
export class YjsA2uiBinder {
  private readonly doc: yjs.Doc;
  private readonly awareness: awarenessProtocol.Awareness;
  private readonly renderer: A2uiRendererService;
  private actorId: string;
  private displayName: string;
  private color: string;

  private readonly metaMap: yjs.Map<string | boolean>;
  private readonly componentsMap: yjs.Map<YDataValue>;
  private readonly componentOrder: yjs.Array<string>;
  private readonly dataMap: yjs.Map<YDataValue>;

  private activeSurfaceId = '';
  private lastComponentsSignature = '';
  private textFieldPaths = new Set<string>();
  private controls: BoundControlDescriptor[] = [];
  private controlById = new Map<string, BoundControlDescriptor>();

  private applyingRemoteToSurface = false;
  private mirroringMeToUsers = false;
  private disposed = false;

  private focusedComponentId = '';
  private focusedPath = '';

  private dataSub: Subscription | null = null;
  private restoreDataModelSet: (() => void) | null = null;

  private readonly handleStructureChange: Parameters<yjs.Map<YDataValue>['observeDeep']>[0] = (
    _events,
    txn,
  ) => {
    if (this.disposed || txn.origin === LOCAL_BINDER_ORIGIN) return;
    this.reconcileSurfaceStructure();
  };

  private readonly handleDataDeepChange: Parameters<yjs.Map<YDataValue>['observeDeep']>[0] = (
    _events,
    txn,
  ) => {
    if (this.disposed || txn.origin === LOCAL_BINDER_ORIGIN) return;
    this.syncYDocDataToSurface();
    this.emitSnapshot();
  };

  private readonly handleAwarenessChange = () => {
    if (this.disposed) return;
    this.emitSnapshot();
  };

  constructor(private readonly options: YjsA2uiBinderOptions) {
    this.doc = options.doc;
    this.awareness = options.awareness;
    this.renderer = options.renderer;
    this.actorId = options.actorId;
    this.displayName = options.displayName;
    this.color = options.color || colorForActor(options.actorId);

    this.metaMap = this.doc.getMap<string | boolean>(ROOT_META_KEY);
    this.componentsMap = this.doc.getMap<YDataValue>(ROOT_COMPONENTS_KEY);
    this.componentOrder = this.doc.getArray<string>(ROOT_COMPONENT_ORDER_KEY);
    this.dataMap = this.doc.getMap<YDataValue>(ROOT_DATA_KEY);

    this.metaMap.observeDeep(this.handleStructureChange);
    this.componentsMap.observeDeep(this.handleStructureChange);
    this.componentOrder.observeDeep(this.handleStructureChange);
    this.dataMap.observeDeep(this.handleDataDeepChange);
    this.awareness.on('change', this.handleAwarenessChange);

    this.publishLocalPresence();
    this.reconcileSurfaceStructure();
  }

  /** Switches the active persona (`actorId`) for `/me/*` scoping and Presence. */
  setIdentity(actorId: string, displayName: string, color?: string): void {
    if (this.disposed) return;
    this.actorId = actorId;
    this.displayName = displayName;
    this.color = color || colorForActor(actorId);
    this.focusedComponentId = '';
    this.focusedPath = '';
    this.publishLocalPresence();
    this.syncYDocDataToSurface();
    this.emitSnapshot();
  }

  /** Broadcasts which A2UI component this user is actively focusing or editing. */
  setFocusedComponent(componentId: string | null): void {
    if (this.disposed) return;
    const nextId = componentId ?? '';
    const ctrl = nextId ? this.controlById.get(nextId) : undefined;
    const nextPath = ctrl ? ctrl.boundPath : '';
    if (this.focusedComponentId === nextId && this.focusedPath === nextPath) {
      return;
    }
    this.focusedComponentId = nextId;
    this.focusedPath = nextPath;
    this.publishLocalPresence();
    this.emitSnapshot();
  }

  /** Resolves a control descriptor by label text (used to map DOM focus inside Material inputs). */
  findControlByLabel(labelText: string): BoundControlDescriptor | undefined {
    const clean = labelText.trim();
    if (!clean) return undefined;
    for (const ctrl of this.controls) {
      if (ctrl.label && (ctrl.label === clean || clean.startsWith(ctrl.label))) {
        return ctrl;
      }
    }
    return undefined;
  }

  /** Resolves the Nth bound control of `componentType` (used for Slider/Chips without `<mat-label>`). */
  findControlAtOrder(
    componentType: string,
    indexWithinType: number,
  ): BoundControlDescriptor | undefined {
    if (indexWithinType < 0) return undefined;
    let seen = 0;
    for (const ctrl of this.controls) {
      if (ctrl.componentType === componentType) {
        if (seen === indexWithinType) {
          return ctrl;
        }
        seen++;
      }
    }
    return undefined;
  }

  /** Looks up the live `yjs.Text` node backing `rawPath` (resolving `/me/*` to `/users/<actorId>/*`). */
  resolveYText(rawPath: string): yjs.Text | null {
    const norm = normalizePointer(rawPath);
    let crdtPointer = norm;
    if (norm === '/me' || norm.startsWith('/me/')) {
      const suffix = norm === '/me' ? '' : norm.slice(3);
      crdtPointer = `/users/${escapePointerSegment(this.actorId)}${suffix}`;
    }
    const segments = parsePointerSegments(crdtPointer);
    if (segments.length === 0) return null;

    let parent: yjs.Map<YDataValue> = this.dataMap;
    for (let i = 0; i < segments.length - 1; i++) {
      const child = parent.get(segments[i]);
      if (!(child instanceof yjs.Map)) {
        return null;
      }
      parent = child;
    }
    const leaf = parent.get(segments[segments.length - 1]);
    return leaf instanceof yjs.Text ? leaf : null;
  }

  /** Current surface ID mounted in `A2uiRendererService`, or `""` before handshake completes. */
  get surfaceId(): string {
    return this.activeSurfaceId;
  }

  /** Builds a fresh snapshot of peers, bound controls, and CRDT nodes. */
  getSnapshot(): BinderSnapshot {
    const titleVal = this.metaMap.get('title');
    const title = typeof titleVal === 'string' ? titleVal : '';
    const crdtNodes: InspectedCrdtNode[] = [];
    collectCrdtNodes(this.dataMap, '', crdtNodes);

    const rawUsers = yValueToJson(this.dataMap.get('users'));
    const usersData: JsonObject = isJsonObject(rawUsers) ? rawUsers : {};

    return {
      surfaceId: this.activeSurfaceId,
      title,
      componentCount: this.componentsMap.size,
      peers: this.readPeers(),
      controls: [...this.controls],
      crdtNodes,
      usersData,
    };
  }

  private publishLocalPresence(): void {
    const ctrl = this.focusedComponentId
      ? this.controlById.get(this.focusedComponentId)
      : undefined;
    this.awareness.setLocalState({
      actorId: this.actorId,
      displayName: this.displayName,
      color: this.color,
      focusedComponentId: this.focusedComponentId,
      focusedPath: this.focusedPath,
      focusedLabel: ctrl ? ctrl.label : '',
      updatedAt: Date.now(),
    });
  }

  private readPeers(): PeerPresence[] {
    const out: PeerPresence[] = [];
    for (const [clientId, state] of this.awareness.getStates().entries()) {
      if (!state || typeof state !== 'object') continue;
      const actorId = typeof state['actorId'] === 'string' ? state['actorId'] : '';
      if (!actorId) continue;
      const displayName =
        typeof state['displayName'] === 'string' && state['displayName']
          ? state['displayName']
          : actorId;
      const color =
        typeof state['color'] === 'string' && state['color']
          ? state['color']
          : colorForActor(actorId);
      const focusedComponentId =
        typeof state['focusedComponentId'] === 'string' ? state['focusedComponentId'] : '';
      const focusedPath = typeof state['focusedPath'] === 'string' ? state['focusedPath'] : '';
      const focusedLabel = typeof state['focusedLabel'] === 'string' ? state['focusedLabel'] : '';
      const updatedAt = typeof state['updatedAt'] === 'number' ? state['updatedAt'] : 0;

      out.push({
        clientId,
        actorId,
        displayName,
        color,
        isLocal: clientId === this.doc.clientID,
        focusedComponentId,
        focusedPath,
        focusedLabel,
        updatedAt,
      });
    }
    out.sort((a, b) => {
      if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
    return out;
  }

  private reconcileSurfaceStructure(): void {
    const rawSurfaceId = this.metaMap.get('surfaceId');
    const surfaceId = typeof rawSurfaceId === 'string' ? rawSurfaceId : '';
    if (!surfaceId) {
      this.emitSnapshot();
      return;
    }

    const components = this.readOrderedComponents();
    if (components.length === 0) {
      this.emitSnapshot();
      return;
    }
    const hasRoot = components.some(c => c['id'] === 'root');
    if (!hasRoot) {
      this.emitSnapshot();
      return;
    }

    const signature = JSON.stringify(components);
    this.updateControlCatalog(components);

    const rawCatalogId = this.metaMap.get('catalogId');
    const catalogId =
      typeof rawCatalogId === 'string' && rawCatalogId
        ? rawCatalogId
        : 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json';
    const rawSendData = this.metaMap.get('sendDataModel');
    const sendDataModel = typeof rawSendData === 'boolean' ? rawSendData : true;

    const existingSurface = this.renderer.surfaceGroup.getSurface(surfaceId);
    if (!existingSurface) {
      if (this.activeSurfaceId && this.activeSurfaceId !== surfaceId) {
        this.detachSurfaceHooks();
        this.renderer.processMessages([
          {version: 'v0.9', deleteSurface: {surfaceId: this.activeSurfaceId}},
        ]);
      }
      this.activeSurfaceId = surfaceId;
      this.lastComponentsSignature = signature;
      this.renderer.processMessages([
        {
          version: 'v0.9',
          createSurface: {
            surfaceId,
            catalogId,
            sendDataModel,
          },
        },
        {
          version: 'v0.9',
          updateComponents: {
            surfaceId,
            components,
          },
        },
      ]);
      const createdSurface = this.renderer.surfaceGroup.getSurface(surfaceId);
      if (createdSurface) {
        this.attachSurfaceHooks(createdSurface);
        this.ensureDefaultLocalViewportState(createdSurface);
        this.syncYDocDataToSurface();
      }
      this.emitSnapshot();
      return;
    }

    if (signature !== this.lastComponentsSignature) {
      this.lastComponentsSignature = signature;
      this.renderer.processMessages([
        {
          version: 'v0.9',
          updateComponents: {
            surfaceId,
            components,
          },
        },
      ]);
      this.syncYDocDataToSurface();
    }
    this.emitSnapshot();
  }

  private readOrderedComponents(): JsonObject[] {
    const order = this.componentOrder.toArray();
    const seen = new Set<string>();
    const ids: string[] = [];

    for (const id of order) {
      if (typeof id === 'string' && id && this.componentsMap.has(id) && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    const extra: string[] = [];
    for (const key of this.componentsMap.keys()) {
      if (!seen.has(key)) {
        extra.push(key);
      }
    }
    extra.sort();
    ids.push(...extra);

    const rootIdx = ids.indexOf('root');
    if (rootIdx > 0) {
      ids.splice(rootIdx, 1);
      ids.unshift('root');
    }

    const result: JsonObject[] = [];
    for (const id of ids) {
      const converted = yValueToJson(this.componentsMap.get(id));
      if (isJsonObject(converted)) {
        result.push(converted);
      }
    }
    return result;
  }

  private updateControlCatalog(components: readonly JsonObject[]): void {
    const nextTextPaths = new Set<string>();
    const nextControls: BoundControlDescriptor[] = [];
    const nextById = new Map<string, BoundControlDescriptor>();

    for (const comp of components) {
      const id = typeof comp['id'] === 'string' ? comp['id'] : '';
      const compType = typeof comp['component'] === 'string' ? comp['component'] : '';
      if (!id || !compType) continue;

      const boundPath = extractBoundPath(comp, compType);
      if (!boundPath) continue;

      const norm = normalizePointer(boundPath);
      const label = extractStaticLabel(comp, norm);
      const isLocal = norm === '/local' || norm.startsWith('/local/');

      let crdtKind: 'Y.Text' | 'Y.Array' | 'Y.Map(LWW)' | 'LocalOnly' = 'Y.Map(LWW)';
      if (isLocal) {
        crdtKind = 'LocalOnly';
      } else if (compType === 'TextField') {
        crdtKind = 'Y.Text';
        nextTextPaths.add(norm);
        if (norm.startsWith('/me/')) {
          nextTextPaths.add(`/users/*/${norm.slice(4)}`);
        }
      } else if (
        compType === 'OptionSelector' ||
        (compType === 'Chips' && comp['variant'] === 'filter-multiple')
      ) {
        crdtKind = 'Y.Array';
      }

      const descriptor: BoundControlDescriptor = {
        componentId: id,
        componentType: compType,
        label,
        boundPath: norm,
        crdtKind,
      };
      nextControls.push(descriptor);
      nextById.set(id, descriptor);
    }

    this.textFieldPaths = nextTextPaths;
    this.controls = nextControls;
    this.controlById = nextById;
  }

  private attachSurfaceHooks(surface: SurfaceModel): void {
    this.detachSurfaceHooks();
    const dm: DataModel = surface.dataModel;
    const originalSet = dm.set.bind(dm);

    const interceptedSet = (
      path: string,
      value: JsonValue | undefined,
      preserveNull?: boolean,
    ): DataModel => {
      const res = originalSet(path, value, preserveNull);
      if (!this.applyingRemoteToSurface && !this.mirroringMeToUsers && !this.disposed) {
        this.handleLocalDataModelWrite(surface, path);
      }
      return res;
    };
    Object.defineProperty(dm, 'set', {
      value: interceptedSet,
      configurable: true,
      writable: true,
    });
    this.restoreDataModelSet = () => {
      Object.defineProperty(dm, 'set', {
        value: originalSet,
        configurable: true,
        writable: true,
      });
    };

    // Secondary reactive subscription in case a caller mutates root state via signal batching.
    this.dataSub = dm.subscribe<JsonObject>('/', () => {
      if (!this.applyingRemoteToSurface && !this.mirroringMeToUsers && !this.disposed) {
        this.reconcileAllLocalPathsToYDoc(surface);
      }
    });
  }

  private detachSurfaceHooks(): void {
    if (this.dataSub) {
      this.dataSub.unsubscribe();
      this.dataSub = null;
    }
    if (this.restoreDataModelSet) {
      this.restoreDataModelSet();
      this.restoreDataModelSet = null;
    }
  }

  private ensureDefaultLocalViewportState(surface: SurfaceModel): void {
    const existing = surface.dataModel.get<JsonValue | undefined>('/local/sectionFilter');
    if (existing === undefined) {
      this.applyingRemoteToSurface = true;
      try {
        surface.dataModel.set('/local/sectionFilter', 'all');
      } finally {
        this.applyingRemoteToSurface = false;
      }
    }
  }

  private syncYDocDataToSurface(): void {
    if (!this.activeSurfaceId) return;
    const surface = this.renderer.surfaceGroup.getSurface(this.activeSurfaceId);
    if (!surface) return;

    const rawDocObj = yValueToJson(this.dataMap);
    const docData: JsonObject = isJsonObject(rawDocObj) ? rawDocObj : {};

    this.options.onBeforeSurfaceSync?.();
    this.applyingRemoteToSurface = true;
    try {
      const currentRoot = surface.dataModel.get<JsonValue | undefined>('/');
      const currentObj: JsonObject = isJsonObject(currentRoot) ? currentRoot : {};

      // Remove top-level shared keys deleted from Y.Doc (never touch `local` or `me`).
      for (const existingKey of Object.keys(currentObj)) {
        if (existingKey === 'local' || existingKey === 'me') continue;
        if (!Object.prototype.hasOwnProperty.call(docData, existingKey)) {
          surface.dataModel.delete(`/${escapePointerSegment(existingKey)}`);
        }
      }

      // Diff-apply every Y.Doc top-level namespace (including `/shared` and `/users`).
      for (const key of Object.keys(docData)) {
        if (key === 'local' || key === 'me') continue;
        this.applyJsonDiffToDataModel(
          surface.dataModel,
          `/${escapePointerSegment(key)}`,
          docData[key],
        );
      }

      // Project `/users/<actorId>` onto `/me` for per-collaborator controls!
      const usersVal = docData['users'];
      const mySlice =
        isJsonObject(usersVal) && isJsonObject(usersVal[this.actorId])
          ? usersVal[this.actorId]
          : {};
      this.applyJsonDiffToDataModel(surface.dataModel, '/me', mySlice);
    } finally {
      this.applyingRemoteToSurface = false;
    }
    this.options.onAfterSurfaceSync?.();
  }

  private applyJsonDiffToDataModel(
    dm: DataModel,
    pointer: string,
    nextVal: JsonValue | undefined,
  ): void {
    const prevVal = dm.get<JsonValue | undefined>(pointer);
    if (jsonEquals(prevVal, nextVal)) {
      return;
    }
    if (isJsonObject(prevVal) && isJsonObject(nextVal)) {
      for (const prevKey of Object.keys(prevVal)) {
        if (!Object.prototype.hasOwnProperty.call(nextVal, prevKey)) {
          dm.delete(`${pointer}/${escapePointerSegment(prevKey)}`);
        }
      }
      for (const nextKey of Object.keys(nextVal)) {
        this.applyJsonDiffToDataModel(
          dm,
          `${pointer}/${escapePointerSegment(nextKey)}`,
          nextVal[nextKey],
        );
      }
      return;
    }
    dm.set(pointer, cloneJsonValue(nextVal));
  }

  private handleLocalDataModelWrite(surface: SurfaceModel, rawPath: string): void {
    const norm = normalizePointer(rawPath);
    if (norm === '/local' || norm.startsWith('/local/')) {
      // Strictly viewport-local UI state — never propagate to Y.Doc!
      // If a user re-clicks the active `filter-single` chip (`""`), restore `'all'`
      // on the next microtask so `"All Sections"` re-highlights and cards never hide.
      if (norm === '/local/sectionFilter') {
        const filterVal = surface.dataModel.get<JsonValue | undefined>(norm);
        if (filterVal === '' || filterVal === undefined || filterVal === null) {
          queueMicrotask(() => {
            if (this.disposed) return;
            // Tick before and after so MaterialChips' linkedSignal observes `'' -> 'all'`.
            this.options.onAfterSurfaceSync?.();
            this.applyingRemoteToSurface = true;
            try {
              surface.dataModel.set('/local/sectionFilter', 'all');
            } finally {
              this.applyingRemoteToSurface = false;
            }
            this.options.onAfterSurfaceSync?.();
          });
        }
      }
      return;
    }
    if (norm === '/') {
      this.reconcileAllLocalPathsToYDoc(surface);
      return;
    }

    let crdtPointer = norm;
    if (norm === '/me' || norm.startsWith('/me/')) {
      const suffix = norm === '/me' ? '' : norm.slice(3);
      crdtPointer = `/users/${escapePointerSegment(this.actorId)}${suffix}`;

      const localMeVal = surface.dataModel.get<JsonValue | undefined>(norm);
      this.mirroringMeToUsers = true;
      try {
        this.applyJsonDiffToDataModel(surface.dataModel, crdtPointer, localMeVal);
      } finally {
        this.mirroringMeToUsers = false;
      }
    }

    const nextVal = surface.dataModel.get<JsonValue | undefined>(norm);
    this.doc.transact(() => {
      this.writeValueToYDoc(crdtPointer, nextVal);
    }, LOCAL_BINDER_ORIGIN);
    this.emitSnapshot();
  }

  private reconcileAllLocalPathsToYDoc(surface: SurfaceModel): void {
    const rootVal = surface.dataModel.get<JsonValue | undefined>('/');
    if (!isJsonObject(rootVal)) return;

    this.doc.transact(() => {
      for (const key of Object.keys(rootVal)) {
        if (key === 'local' || key === 'users') continue;
        if (key === 'me') {
          const meVal = rootVal['me'];
          if (isJsonObject(meVal)) {
            const actorBase = `/users/${escapePointerSegment(this.actorId)}`;
            this.writeValueToYDoc(actorBase, meVal);
          }
          continue;
        }
        this.writeValueToYDoc(`/${escapePointerSegment(key)}`, rootVal[key]);
      }
    }, LOCAL_BINDER_ORIGIN);
  }

  private writeValueToYDoc(pointer: string, value: JsonValue | undefined): void {
    const segments = parsePointerSegments(pointer);
    if (segments.length === 0) return;

    let parent = this.dataMap;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const existing = parent.get(seg);
      if (existing instanceof yjs.Map) {
        parent = existing;
      } else {
        if (value === undefined || value === null) return;
        const created = new yjs.Map<YDataValue>();
        parent.set(seg, created);
        parent = created;
      }
    }

    const leafKey = segments[segments.length - 1];
    const currentEntry = parent.get(leafKey);

    if (value === undefined || value === null) {
      if (parent.has(leafKey)) {
        parent.delete(leafKey);
      }
      return;
    }

    if (typeof value === 'string') {
      if (currentEntry instanceof yjs.Text) {
        const oldStr = currentEntry.toJSON();
        if (oldStr === value) return;
        const diff = computeStringEditDiff(oldStr, value);
        if (diff.deleteCount > 0) {
          currentEntry.delete(diff.index, diff.deleteCount);
        }
        if (diff.insertText.length > 0) {
          currentEntry.insert(diff.index, diff.insertText);
        }
        return;
      }
      if (this.shouldUseYText(pointer)) {
        const yt = new yjs.Text();
        if (value.length > 0) {
          yt.insert(0, value);
        }
        parent.set(leafKey, yt);
        return;
      }
      if (currentEntry === value) return;
      parent.set(leafKey, value);
      return;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      if (currentEntry === value) return;
      parent.set(leafKey, value);
      return;
    }

    if (Array.isArray(value)) {
      if (currentEntry instanceof yjs.Array && jsonEquals(yValueToJson(currentEntry), value)) {
        return;
      }
      parent.set(leafKey, this.buildYArray(value, pointer));
      return;
    }

    if (isJsonObject(value)) {
      if (currentEntry instanceof yjs.Map) {
        for (const existingKey of Array.from(currentEntry.keys())) {
          if (!Object.prototype.hasOwnProperty.call(value, existingKey)) {
            currentEntry.delete(existingKey);
          }
        }
        for (const k of Object.keys(value)) {
          this.writeValueToYDoc(`${pointer}/${escapePointerSegment(k)}`, value[k]);
        }
        return;
      }
      const nestedMap = new yjs.Map<YDataValue>();
      parent.set(leafKey, nestedMap);
      for (const k of Object.keys(value)) {
        this.writeValueToYDoc(`${pointer}/${escapePointerSegment(k)}`, value[k]);
      }
    }
  }

  private buildYArray(items: JsonArray, basePointer: string): yjs.Array<YDataValue> {
    const arr = new yjs.Array<YDataValue>();
    const converted: YDataValue[] = items.map((item, idx) =>
      this.buildDetachedYValue(item, `${basePointer}/${idx}`),
    );
    if (converted.length > 0) {
      arr.push(converted);
    }
    return arr;
  }

  private buildDetachedYValue(val: JsonValue, pointer: string): YDataValue {
    if (val === null || typeof val === 'number' || typeof val === 'boolean') {
      return val;
    }
    if (typeof val === 'string') {
      if (this.shouldUseYText(pointer)) {
        return new yjs.Text(val);
      }
      return val;
    }
    if (Array.isArray(val)) {
      return this.buildYArray(val, pointer);
    }
    const map = new yjs.Map<YDataValue>();
    for (const k of Object.keys(val)) {
      map.set(k, this.buildDetachedYValue(val[k], `${pointer}/${escapePointerSegment(k)}`));
    }
    return map;
  }

  private shouldUseYText(pointer: string): boolean {
    if (this.textFieldPaths.has(pointer)) return true;
    if (pointer.startsWith('/users/')) {
      const rest = pointer.slice('/users/'.length);
      const slashIdx = rest.indexOf('/');
      if (slashIdx > 0) {
        return this.textFieldPaths.has(`/users/*${rest.slice(slashIdx)}`);
      }
    }
    return false;
  }

  private emitSnapshot(): void {
    this.options.onSnapshotChange?.(this.getSnapshot());
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.detachSurfaceHooks();
    this.metaMap.unobserveDeep(this.handleStructureChange);
    this.componentsMap.unobserveDeep(this.handleStructureChange);
    this.componentOrder.unobserveDeep(this.handleStructureChange);
    this.dataMap.unobserveDeep(this.handleDataDeepChange);
    this.awareness.off('change', this.handleAwarenessChange);
  }
}

function extractBoundPath(comp: JsonObject, compType: string): string {
  const candidates =
    compType === 'Checkbox' || compType === 'Switch'
      ? ['checked']
      : compType === 'OptionSelector'
        ? ['selectedValues', 'value']
        : ['value'];

  for (const propName of candidates) {
    const raw = comp[propName];
    if (isJsonObject(raw)) {
      if (typeof raw['@path'] === 'string') return raw['@path'];
      if (typeof raw['path'] === 'string') return raw['path'];
    }
  }
  return '';
}

function extractStaticLabel(comp: JsonObject, boundPath: string): string {
  for (const key of ['label', 'title', 'labelText', 'placeholder']) {
    const v = comp[key];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  const segs = parsePointerSegments(boundPath);
  if (segs.length > 0) {
    const tail = segs[segs.length - 1]
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim();
    if (tail) {
      return tail.charAt(0).toUpperCase() + tail.slice(1);
    }
  }
  return typeof comp['id'] === 'string' ? comp['id'] : '';
}

function collectCrdtNodes(
  map: yjs.Map<YDataValue>,
  prefix: string,
  out: InspectedCrdtNode[],
): void {
  const keys = Array.from(map.keys()).sort();
  for (const key of keys) {
    const ptr = `${prefix}/${escapePointerSegment(key)}`;
    const val = map.get(key);
    if (val === undefined) continue;
    if (val instanceof yjs.Text) {
      const str = val.toJSON();
      out.push({
        path: ptr,
        crdtType: 'Y.Text',
        preview: str.length > 64 ? `${str.slice(0, 64)}...` : str,
      });
    } else if (val instanceof yjs.Map) {
      out.push({
        path: ptr,
        crdtType: 'Y.Map',
        preview: `{${val.size} keys}`,
      });
      collectCrdtNodes(val, ptr, out);
    } else if (val instanceof yjs.Array) {
      out.push({
        path: ptr,
        crdtType: 'Y.Array',
        preview: `[${val.length} items]`,
      });
    } else {
      const text = JSON.stringify(val);
      out.push({
        path: ptr,
        crdtType: 'Y.Map(LWW)',
        preview: text.length > 64 ? `${text.slice(0, 64)}...` : text,
      });
    }
  }
}
