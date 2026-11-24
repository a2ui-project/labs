/*
 * Copyright 2024 Google LLC
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

import {Component, computed, input, signal} from '@angular/core';

import {
  type BinderSnapshot,
  type BoundControlDescriptor,
  type InspectedCrdtNode,
} from '../binder/yjs_a2ui_binder';
import {type WireFrameEvent} from '../binder/yjs_transport';

/** Server activity entry returned by `/api/rooms/{room}`. */
export interface RoomActivityItem {
  readonly id: string;
  readonly timestamp: string;
  readonly actorId: string;
  readonly actorName: string;
  readonly kind: string;
  readonly summary: string;
  readonly source?: string;
}

type InspectorTab = 'crdt' | 'bindings' | 'stream';

/**
 * Live diagnostic panel exposing how A2UI v1.0 component properties and data
 * pointers map onto underlying `Y.Text`, `Y.Array`, and `Y.Map` CRDT structures.
 */
@Component({
  selector: 'yjs-a2ui-crdt-inspector',
  templateUrl: './crdt_inspector.html',
  styleUrl: './crdt_inspector.scss',
})
export class CrdtInspector {
  readonly snapshot = input<BinderSnapshot | null>(null);
  readonly wireFrames = input<readonly WireFrameEvent[]>([]);
  readonly activityLog = input<readonly RoomActivityItem[]>([]);

  protected readonly activeTab = signal<InspectorTab>('crdt');

  protected readonly crdtNodes = computed<readonly InspectedCrdtNode[]>(
    () => this.snapshot()?.crdtNodes ?? [],
  );

  protected readonly controls = computed<readonly BoundControlDescriptor[]>(
    () => this.snapshot()?.controls ?? [],
  );

  protected selectTab(tab: InspectorTab): void {
    this.activeTab.set(tab);
  }
}
