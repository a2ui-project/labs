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

import {A2uiRendererService, SurfaceComponent} from '@a2ui/angular';
import {type ActionPayload} from '@a2ui/web_core/v0_9';
import {
  ApplicationRef,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as yjs from 'yjs';

import {transformIndexAcrossEdit} from '../binder/json_types';
import {
  type BinderSnapshot,
  type BoundControlDescriptor,
  colorForActor,
  type PeerPresence,
  YjsA2uiBinder,
} from '../binder/yjs_a2ui_binder';
import {YjsA2uiSocket, type WireFrameEvent} from '../binder/yjs_transport';
import {provideIsolatedA2uiRenderer} from '../catalog/catalog';

/** Collaborator persona selectable per viewport pane. */
export interface PersonaOption {
  readonly actorId: string;
  readonly displayName: string;
  readonly roleLabel: string;
}

/** Event emitted after a surface button/control action completes on the backend. */
export interface ActionResultEvent {
  readonly actionName: string;
  readonly actorId: string;
  readonly summary: string;
  readonly source: string;
}

type SelectionDir = 'forward' | 'backward' | 'none';

interface TrackedInputSelection {
  readonly element: HTMLInputElement | HTMLTextAreaElement;
  readonly boundPath: string;
  readonly start: number;
  readonly end: number;
  readonly direction: SelectionDir;
  readonly relStart: yjs.RelativePosition | null;
  readonly relEnd: yjs.RelativePosition | null;
}

interface PendingSelectionRestore {
  readonly element: HTMLInputElement | HTMLTextAreaElement;
  readonly boundPath: string;
  readonly beforeValue: string;
  readonly beforeStart: number;
  readonly beforeEnd: number;
  readonly direction: SelectionDir;
  readonly relStart: yjs.RelativePosition | null;
  readonly relEnd: yjs.RelativePosition | null;
}

const CONTROL_HOST_SELECTOR =
  'a2ui-v09-text-field, a2ui-v09-choice-picker, a2ui-v09-slider, a2ui-v09-check-box';

const TAG_TO_COMPONENT_TYPE: Readonly<Record<string, string>> = {
  'a2ui-v09-text-field': 'TextField',
  'a2ui-v09-choice-picker': 'ChoicePicker',
  'a2ui-v09-slider': 'Slider',
  'a2ui-v09-check-box': 'CheckBox',
};

/**
 * Isolated A2UI v1.0 viewport bound to its own `yjs.Doc`, `Awareness`, and
 * WebSocket connection so multiple peers can collaborate side-by-side or across tabs.
 */
@Component({
  selector: 'yjs-a2ui-surface-pane',
  imports: [SurfaceComponent],
  providers: [...provideIsolatedA2uiRenderer()],
  templateUrl: './surface_pane.html',
  styleUrl: './surface_pane.scss',
})
export class SurfacePane {
  private readonly renderer = inject(A2uiRendererService);
  private readonly appRef = inject(ApplicationRef);
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly roomId = input.required<string>();
  readonly actorId = input.required<string>();
  readonly displayName = input.required<string>();
  readonly roleLabel = input<string>('');
  readonly personaOptions = input<readonly PersonaOption[]>([]);
  readonly disableNetwork = input<boolean>(false);

  readonly personaSelected = output<PersonaOption>();
  readonly snapshotUpdated = output<BinderSnapshot>();
  readonly wireFrameRecorded = output<WireFrameEvent>();
  readonly actionDispatched = output<ActionResultEvent>();

  protected readonly connected = signal<boolean>(false);
  protected readonly surfaceId = signal<string>('');
  protected readonly actionBusy = signal<boolean>(false);
  protected readonly actionBanner = signal<string>('');
  protected readonly peers = signal<readonly PeerPresence[]>([]);

  protected readonly actorColor = computed<string>(() => colorForActor(this.actorId()));

  protected readonly remoteFocusedPeers = computed<readonly PeerPresence[]>(() =>
    this.peers().filter(p => !p.isLocal && p.focusedLabel.length > 0),
  );

  private doc: yjs.Doc | null = null;
  private awareness: awarenessProtocol.Awareness | null = null;
  private binder: YjsA2uiBinder | null = null;
  private socket: YjsA2uiSocket | null = null;
  private activeRoom = '';
  private trackedSelection: TrackedInputSelection | null = null;
  private pendingRestore: PendingSelectionRestore | null = null;
  private flushingDom = false;

  constructor() {
    const actionSub = this.renderer.surfaceGroup.onAction.subscribe(action => {
      void this.sendSurfaceAction(action);
    });
    const errorSub = this.renderer.surfaceGroup.onError.subscribe(err => {
      const msg = err.message || err.code || 'Surface evaluation error';
      console.warn('[Yjs A2UI Error]', err);
      this.actionBanner.set(`A2UI ${err.code}: ${msg}`);
    });

    this.destroyRef.onDestroy(() => {
      actionSub.unsubscribe();
      errorSub.unsubscribe();
      this.teardownSession();
    });

    effect(() => {
      const nextRoom = this.roomId();
      const offline = this.disableNetwork();
      untracked(() => {
        if (nextRoom !== this.activeRoom) {
          this.mountRoomSession(nextRoom, offline);
        }
      });
    });

    effect(() => {
      const nextActor = this.actorId();
      const nextName = this.displayName();
      untracked(() => {
        if (this.binder) {
          this.binder.setIdentity(nextActor, nextName);
        }
      });
    });
  }

  protected changePersona(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const chosenId = event.target.value;
    const match = this.personaOptions().find(p => p.actorId === chosenId);
    if (match) {
      this.personaSelected.emit(match);
    }
  }

  protected recordControlInteraction(event: Event): void {
    if (!this.binder || !(event.target instanceof HTMLElement)) return;
    const ctrl = this.resolveControlFromTarget(event.target);
    if (ctrl) {
      this.binder.setFocusedComponent(ctrl.componentId);
      if (isSelectableTextControl(event.target)) {
        this.captureInputSelection(event.target, ctrl.boundPath);
      }
    }
  }

  protected clearFocusedElement(event: FocusEvent): void {
    if (!this.binder) return;
    if (
      event.relatedTarget instanceof HTMLElement &&
      event.currentTarget instanceof HTMLElement &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }
    this.trackedSelection = null;
    this.binder.setFocusedComponent(null);
  }

  private resolveControlFromTarget(target: HTMLElement): BoundControlDescriptor | undefined {
    if (!this.binder) return undefined;
    const label = extractNearestControlLabel(target);
    if (label) {
      const byLabel = this.binder.findControlByLabel(label);
      if (byLabel) return byLabel;
    }
    for (const [tag, compType] of Object.entries(TAG_TO_COMPONENT_TYPE)) {
      const host = target.closest(tag);
      if (host instanceof HTMLElement) {
        const allOfTag = Array.from(this.hostEl.nativeElement.querySelectorAll(tag));
        const idx = allOfTag.indexOf(host);
        if (idx >= 0) {
          return this.binder.findControlAtOrder(compType, idx);
        }
      }
    }
    return undefined;
  }

  private captureInputSelection(
    el: HTMLInputElement | HTMLTextAreaElement,
    boundPath: string,
  ): void {
    if (!this.binder) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === null || end === null) return;

    let relStart: yjs.RelativePosition | null = null;
    let relEnd: yjs.RelativePosition | null = null;
    const ytext = this.binder.resolveYText(boundPath);
    if (ytext !== null && ytext.toJSON() === el.value) {
      relStart = yjs.createRelativePositionFromTypeIndex(ytext, start, -1);
      relEnd = yjs.createRelativePositionFromTypeIndex(ytext, end, -1);
    }

    this.trackedSelection = {
      element: el,
      boundPath,
      start,
      end,
      direction: normalizeDirection(el.selectionDirection),
      relStart,
      relEnd,
    };
  }

  private captureBeforeRemoteSync(): void {
    this.pendingRestore = null;
    if (typeof document === 'undefined' || !this.binder) return;
    const active = document.activeElement;
    if (
      !(active instanceof HTMLElement) ||
      !this.hostEl.nativeElement.contains(active) ||
      !isSelectableTextControl(active)
    ) {
      return;
    }
    const start = active.selectionStart;
    const end = active.selectionEnd;
    if (start === null || end === null) return;

    const tracked = this.trackedSelection?.element === active ? this.trackedSelection : null;
    const ctrl = this.resolveControlFromTarget(active);
    const boundPath = tracked?.boundPath ?? ctrl?.boundPath ?? '';

    let relStart = tracked?.relStart ?? null;
    let relEnd = tracked?.relEnd ?? null;
    if ((relStart === null || relEnd === null) && boundPath) {
      const ytext = this.binder.resolveYText(boundPath);
      if (ytext !== null && ytext.toJSON() === active.value) {
        relStart = yjs.createRelativePositionFromTypeIndex(ytext, start, -1);
        relEnd = yjs.createRelativePositionFromTypeIndex(ytext, end, -1);
      }
    }

    this.pendingRestore = {
      element: active,
      boundPath,
      beforeValue: active.value,
      beforeStart: start,
      beforeEnd: end,
      direction: normalizeDirection(active.selectionDirection),
      relStart,
      relEnd,
    };
  }

  private flushAndRestoreAfterRemoteSync(): void {
    const restore = this.pendingRestore;
    this.pendingRestore = null;

    if (!this.flushingDom) {
      this.flushingDom = true;
      try {
        this.appRef.tick();
      } catch {
        // Safe guard when called inside an existing Angular tick or teardown.
      } finally {
        this.flushingDom = false;
      }
    }

    if (!restore || typeof document === 'undefined' || document.activeElement !== restore.element) {
      return;
    }

    const afterValue = restore.element.value;
    if (afterValue === restore.beforeValue) {
      return;
    }

    let nextStart: number | null = null;
    let nextEnd: number | null = null;
    if (this.doc && this.binder && restore.boundPath) {
      const ytext = this.binder.resolveYText(restore.boundPath);
      if (ytext !== null && restore.relStart && restore.relEnd) {
        const absStart = yjs.createAbsolutePositionFromRelativePosition(restore.relStart, this.doc);
        const absEnd = yjs.createAbsolutePositionFromRelativePosition(restore.relEnd, this.doc);
        if (absStart && absEnd && absStart.type === ytext) {
          nextStart = clampIndex(absStart.index, afterValue.length);
          nextEnd = clampIndex(absEnd.index, afterValue.length);
        }
      }
    }

    if (nextStart === null || nextEnd === null) {
      nextStart = transformIndexAcrossEdit(restore.beforeStart, restore.beforeValue, afterValue);
      nextEnd = transformIndexAcrossEdit(restore.beforeEnd, restore.beforeValue, afterValue);
    }

    try {
      restore.element.setSelectionRange(nextStart, nextEnd, restore.direction);
    } catch {
      // Non-selectable input types ignore setSelectionRange.
    }
    if (restore.boundPath) {
      this.captureInputSelection(restore.element, restore.boundPath);
    }
  }

  private mountRoomSession(roomId: string, disableNetwork: boolean): void {
    this.teardownSession();
    this.activeRoom = roomId;
    this.surfaceId.set('');
    this.connected.set(false);
    this.actionBanner.set('');
    if (!roomId) return;

    const doc = new yjs.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    const binder = new YjsA2uiBinder({
      doc,
      awareness,
      renderer: this.renderer,
      actorId: this.actorId(),
      displayName: this.displayName(),
      onSnapshotChange: snap => {
        this.surfaceId.set(snap.surfaceId);
        this.peers.set(snap.peers);
        this.snapshotUpdated.emit(snap);
      },
      onBeforeSurfaceSync: () => {
        this.captureBeforeRemoteSync();
      },
      onAfterSurfaceSync: () => {
        this.flushAndRestoreAfterRemoteSync();
      },
    });

    this.doc = doc;
    this.awareness = awareness;
    this.binder = binder;

    if (!disableNetwork && typeof window !== 'undefined') {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws/rooms/${encodeURIComponent(roomId)}`;
      this.socket = new YjsA2uiSocket({
        url: wsUrl,
        doc,
        awareness,
        onConnectionChange: isConnected => {
          this.connected.set(isConnected);
        },
        onWireFrame: frame => {
          this.wireFrameRecorded.emit(frame);
        },
      });
    }
  }

  private async sendSurfaceAction(action: ActionPayload): Promise<void> {
    const roomId = this.roomId();
    if (!roomId || this.disableNetwork()) {
      return;
    }

    this.actionBusy.set(true);
    this.actionBanner.set(`Running ${action.name}...`);
    try {
      const resp = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/action`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          actorId: this.actorId(),
          actorName: this.displayName(),
          actionName: action.name,
          sourceComponentId: action.sourceComponentId,
          context: action.context,
        }),
      });
      if (!resp.ok) {
        this.actionBanner.set(`Action ${action.name} failed (${resp.status})`);
        return;
      }
      const data: {summary?: string; source?: string} = await resp.json();
      const summary = typeof data.summary === 'string' ? data.summary : 'Updated surface';
      const source = typeof data.source === 'string' ? data.source : 'agent';
      this.actionBanner.set(summary);
      this.actionDispatched.emit({
        actionName: action.name,
        actorId: this.actorId(),
        summary,
        source,
      });
    } catch {
      this.actionBanner.set(`Network error invoking ${action.name}`);
    } finally {
      this.actionBusy.set(false);
    }
  }

  private teardownSession(): void {
    const prevSurfaceId = this.binder?.surfaceId ?? '';
    this.trackedSelection = null;
    this.pendingRestore = null;
    if (this.socket) {
      this.socket.dispose();
      this.socket = null;
    }
    if (this.binder) {
      this.binder.dispose();
      this.binder = null;
    }
    if (prevSurfaceId) {
      if (this.renderer.surfaceGroup.getSurface(prevSurfaceId)) {
        this.renderer.processMessages([
          {version: 'v0.9', deleteSurface: {surfaceId: prevSurfaceId}},
        ]);
      }
    }
    if (this.awareness) {
      this.awareness.destroy();
      this.awareness = null;
    }
    if (this.doc) {
      this.doc.destroy();
      this.doc = null;
    }
  }
}

function extractNearestControlLabel(target: HTMLElement): string {
  const fieldEl = target.closest(CONTROL_HOST_SELECTOR);
  if (!fieldEl) return '';
  const labelNode = fieldEl.querySelector(
    'mat-label, .mdc-floating-label, .a2ui-radio-group-label, label',
  );
  return labelNode?.textContent?.trim() ?? '';
}

function isSelectableTextControl(el: HTMLElement): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  const t = el.type.toLowerCase();
  return t === 'text' || t === 'search' || t === 'url' || t === 'tel' || t === 'password';
}

function normalizeDirection(dir: string | null): SelectionDir {
  if (dir === 'forward' || dir === 'backward') return dir;
  return 'none';
}

function clampIndex(idx: number, maxLen: number): number {
  return Math.max(0, Math.min(maxLen, idx));
}
