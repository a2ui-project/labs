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

import {Component, computed, input, OnInit, signal} from '@angular/core';

import {type BinderSnapshot, colorForActor, type PeerPresence} from '../binder/yjs_a2ui_binder';
import {type WireFrameEvent} from '../binder/yjs_transport';
import {CrdtInspector, type RoomActivityItem} from '../inspector/crdt_inspector';
import {type ActionResultEvent, type PersonaOption, SurfacePane} from '../viewport/surface_pane';

/** Room metadata entry returned by `GET /api/rooms`. */
export interface RoomSummary {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly surfaceId: string;
  readonly builtIn: boolean;
}

const PERSONA_ROSTER: readonly PersonaOption[] = [
  {actorId: 'alice', displayName: 'Alice', roleLabel: 'Eng Lead'},
  {actorId: 'bob', displayName: 'Bob', roleLabel: 'Systems / Security'},
  {actorId: 'charlie', displayName: 'Charlie', roleLabel: 'SRE'},
  {actorId: 'diana', displayName: 'Diana', roleLabel: 'Product'},
];

const QUICK_PROMPTS: readonly string[] = [
  'Synthesize where Alice, Bob, and Charlie agree and disagree',
  'Add a security & privacy sign-off checklist card',
  'Add a rollout risk mitigation card with owner and notes',
];

const FALLBACK_ROOMS: readonly RoomSummary[] = [
  {
    id: 'arch-tradeoff',
    title: 'Architecture Trade-off Studio',
    description:
      'Concurrent Y.Text notes, per-user /me votes, /local viewport filters, and live Gemini consensus synthesis.',
    surfaceId: 'arch_tradeoff_surface',
    builtIn: true,
  },
  {
    id: 'incident-war-room',
    title: 'Incident War Room (P1 Checkout Timeout)',
    description:
      'Multi-responder live timeline, mitigation checklist, per-responder status, and AI status-update drafting.',
    surfaceId: 'incident_war_room_surface',
    builtIn: true,
  },
  {
    id: 'launch-signoff',
    title: 'Launch Readiness Sign-Off (Go/No-Go)',
    description:
      'Cross-functional Eng / Security / SRE Go/No-Go sign-off with atomic enum decisions and shared rollout controls.',
    surfaceId: 'launch_signoff_surface',
    builtIn: true,
  },
];

/**
 * Root Yjs + A2UI workspace shell orchestrating multi-room navigation, 1-peer
 * or 2-peer split viewports, live CRDT inspection, and shared Gemini A2UI agent prompts.
 */
@Component({
  selector: 'yjs-a2ui-app',
  imports: [SurfacePane, CrdtInspector],
  templateUrl: './yjs_a2ui_app.html',
  styleUrl: './yjs_a2ui_app.scss',
})
export class YjsA2uiApp implements OnInit {
  readonly disableNetwork = input<boolean>(false);

  protected readonly personaRoster = PERSONA_ROSTER;
  protected readonly quickPrompts = QUICK_PROMPTS;

  protected readonly rooms = signal<readonly RoomSummary[]>(FALLBACK_ROOMS);
  protected readonly activeRoomId = signal<string>('arch-tradeoff');
  protected readonly splitCount = signal<1 | 2>(2);
  protected readonly inspectorOpen = signal<boolean>(true);
  protected readonly createDialogOpen = signal<boolean>(false);

  protected readonly panePersonas = signal<readonly PersonaOption[]>([
    PERSONA_ROSTER[0],
    PERSONA_ROSTER[1],
  ]);

  protected readonly latestSnapshot = signal<BinderSnapshot | null>(null);
  private readonly paneSnapshots = signal<ReadonlyMap<number, BinderSnapshot>>(new Map());
  protected readonly wireFrames = signal<readonly WireFrameEvent[]>([]);
  protected readonly activityLog = signal<readonly RoomActivityItem[]>([]);

  protected readonly promptDraft = signal<string>('');
  protected readonly promptActorId = signal<string>('alice');
  protected readonly agentBusy = signal<boolean>(false);
  protected readonly statusMessage = signal<string>('');

  protected readonly newRoomTitle = signal<string>('');
  protected readonly newRoomPrompt = signal<string>('');

  protected readonly activeRoom = computed<RoomSummary | undefined>(() =>
    this.rooms().find(r => r.id === this.activeRoomId()),
  );

  protected readonly visiblePanes = computed<readonly PersonaOption[]>(() =>
    this.panePersonas().slice(0, this.splitCount()),
  );

  protected readonly activeCollaborators = computed<readonly PeerPresence[]>(() => {
    const snaps = Array.from(this.paneSnapshots().values());
    if (snaps.length === 0) {
      const single = this.latestSnapshot();
      if (!single) return [];
      snaps.push(single);
    }
    const byActor = new Map<string, PeerPresence>();
    for (const snap of snaps) {
      for (const p of snap.peers) {
        const prev = byActor.get(p.actorId);
        if (
          !prev ||
          p.focusedLabel.length > prev.focusedLabel.length ||
          p.updatedAt > prev.updatedAt
        ) {
          byActor.set(p.actorId, p);
        }
      }
    }
    return Array.from(byActor.values());
  });

  ngOnInit(): void {
    this.readInitialUrlParams();
    if (!this.disableNetwork()) {
      void this.refreshRoomsAndActivity();
    }
  }

  protected selectRoom(roomId: string): void {
    if (!roomId || roomId === this.activeRoomId()) return;
    this.activeRoomId.set(roomId);
    this.latestSnapshot.set(null);
    this.paneSnapshots.set(new Map());
    this.wireFrames.set([]);
    this.statusMessage.set('');
    this.syncUrlQuery();
    if (!this.disableNetwork()) {
      void this.loadRoomActivity(roomId);
    }
  }

  protected changeRoomFromSelect(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) return;
    this.selectRoom(event.target.value);
  }

  protected setSplitMode(count: 1 | 2): void {
    this.splitCount.set(count);
  }

  protected toggleInspector(): void {
    this.inspectorOpen.update(v => !v);
  }

  protected updatePanePersona(paneIndex: number, persona: PersonaOption): void {
    this.panePersonas.update(list => {
      const next = [...list];
      next[paneIndex] = persona;
      return next;
    });
    if (paneIndex === 0) {
      this.promptActorId.set(persona.actorId);
    }
  }

  protected recordSnapshot(paneIndex: number, snap: BinderSnapshot): void {
    this.paneSnapshots.update(prev => {
      const next = new Map(prev);
      next.set(paneIndex, snap);
      return next;
    });
    this.latestSnapshot.set(snap);
  }

  protected recordWireFrame(frame: WireFrameEvent): void {
    this.wireFrames.update(prev => [frame, ...prev].slice(0, 40));
  }

  protected recordSurfaceAction(evt: ActionResultEvent): void {
    this.statusMessage.set(`${evt.summary} (${evt.source})`);
    if (!this.disableNetwork()) {
      void this.loadRoomActivity(this.activeRoomId());
    }
  }

  protected openPeerWindow(): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const nextPersona = this.panePersonas()[0]?.actorId === 'bob' ? 'alice' : 'bob';
    url.searchParams.set('room', this.activeRoomId());
    url.searchParams.set('persona', nextPersona);
    url.searchParams.set('split', '1');
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }

  protected async resetActiveRoom(): Promise<void> {
    if (this.disableNetwork()) return;
    const roomId = this.activeRoomId();
    const lead = this.panePersonas()[0];
    this.agentBusy.set(true);
    this.statusMessage.set('Resetting room Y.Doc to template seed...');
    try {
      const resp = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/reset`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          actorId: lead.actorId,
          actorName: lead.displayName,
        }),
      });
      if (resp.ok) {
        const payload: {activity?: RoomActivityItem[]} = await resp.json();
        if (Array.isArray(payload.activity)) {
          this.activityLog.set([...payload.activity].reverse());
        }
        this.statusMessage.set('Room reset complete across all connected Yjs peers.');
      }
    } finally {
      this.agentBusy.set(false);
    }
  }

  protected updatePromptDraft(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.promptDraft.set(event.target.value);
    }
  }

  protected updatePromptActor(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.promptActorId.set(event.target.value);
    }
  }

  protected applyQuickPrompt(text: string): void {
    this.promptDraft.set(text);
    void this.submitAgentPrompt();
  }

  protected handlePromptKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.submitAgentPrompt();
    }
  }

  protected async submitAgentPrompt(): Promise<void> {
    const prompt = this.promptDraft().trim();
    if (!prompt || this.agentBusy() || this.disableNetwork()) return;

    const actor = PERSONA_ROSTER.find(p => p.actorId === this.promptActorId()) ?? PERSONA_ROSTER[0];
    const roomId = this.activeRoomId();

    this.agentBusy.set(true);
    this.statusMessage.set('AI Co-Editor computing granular CRDT operations...');
    try {
      const resp = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/prompt`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          actorId: actor.actorId,
          actorName: actor.displayName,
          prompt,
        }),
      });
      if (!resp.ok) {
        this.statusMessage.set(`Agent request failed (${resp.status})`);
        return;
      }
      const data: {
        summary?: string;
        source?: string;
        activity?: RoomActivityItem[];
      } = await resp.json();
      this.promptDraft.set('');
      const summary = typeof data.summary === 'string' ? data.summary : 'Applied updates';
      const source = typeof data.source === 'string' ? data.source : 'agent';
      this.statusMessage.set(`${summary} (${source})`);
      if (Array.isArray(data.activity)) {
        this.activityLog.set([...data.activity].reverse());
      }
    } catch {
      this.statusMessage.set('Network error reaching AI Co-Editor');
    } finally {
      this.agentBusy.set(false);
    }
  }

  protected toggleCreateRoomDialog(): void {
    this.createDialogOpen.update(open => !open);
  }

  protected updateNewRoomTitle(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.newRoomTitle.set(event.target.value);
    }
  }

  protected updateNewRoomPrompt(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.newRoomPrompt.set(event.target.value);
    }
  }

  protected async createNewRoom(): Promise<void> {
    const title = this.newRoomTitle().trim();
    if (!title || this.agentBusy() || this.disableNetwork()) return;

    const lead = this.panePersonas()[0];
    this.agentBusy.set(true);
    try {
      const resp = await fetch('/api/rooms', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          title,
          initialPrompt: this.newRoomPrompt().trim(),
          actorId: lead.actorId,
          actorName: lead.displayName,
        }),
      });
      if (!resp.ok) return;
      const data: {room?: RoomSummary} = await resp.json();
      await this.refreshRoomsAndActivity();
      if (data.room?.id) {
        this.newRoomTitle.set('');
        this.newRoomPrompt.set('');
        this.createDialogOpen.set(false);
        this.selectRoom(data.room.id);
      }
    } finally {
      this.agentBusy.set(false);
    }
  }

  protected actorBadgeColor(actorId: string): string {
    return colorForActor(actorId);
  }

  private readInitialUrlParams(): void {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      this.activeRoomId.set(roomParam);
    }
    const splitParam = params.get('split');
    if (splitParam === '1') this.splitCount.set(1);
    if (splitParam === '2') this.splitCount.set(2);

    const personaParam = params.get('persona');
    if (personaParam) {
      const found = PERSONA_ROSTER.find(p => p.actorId === personaParam);
      if (found) {
        this.updatePanePersona(0, found);
        if (!splitParam) {
          this.splitCount.set(1);
        }
      }
    }
  }

  private syncUrlQuery(): void {
    if (typeof window === 'undefined' || !window.history?.replaceState) return;
    const url = new URL(window.location.href);
    url.searchParams.set('room', this.activeRoomId());
    window.history.replaceState({}, '', url.toString());
  }

  private async refreshRoomsAndActivity(): Promise<void> {
    try {
      const resp = await fetch('/api/rooms');
      if (resp.ok) {
        const data: {rooms?: RoomSummary[]} = await resp.json();
        if (Array.isArray(data.rooms) && data.rooms.length > 0) {
          this.rooms.set(data.rooms);
        }
      }
      await this.loadRoomActivity(this.activeRoomId());
    } catch {
      // Offline / unit-test fallback keeps starter rooms.
    }
  }

  private async loadRoomActivity(roomId: string): Promise<void> {
    try {
      const resp = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
      if (!resp.ok) return;
      const data: {activity?: RoomActivityItem[]} = await resp.json();
      if (Array.isArray(data.activity)) {
        this.activityLog.set([...data.activity].reverse());
      }
    } catch {
      // Ignore transient network errors.
    }
  }
}
