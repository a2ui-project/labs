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

import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as yjs from 'yjs';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/** Transaction origin stamped on remote WebSocket updates so local observers skip echoes. */
export const REMOTE_YJS_ORIGIN = 'yjs-a2ui-ws-remote';

/** Wire telemetry frame emitted for the live CRDT Inspector drawer. */
export interface WireFrameEvent {
  readonly timestamp: string;
  readonly direction: 'in' | 'out';
  readonly kind: 'sync' | 'awareness';
  readonly byteLength: number;
}

/** Options configuring `YjsA2uiSocket`. */
export interface YjsA2uiSocketOptions {
  readonly url: string;
  readonly doc: yjs.Doc;
  readonly awareness: awarenessProtocol.Awareness;
  readonly onConnectionChange?: (connected: boolean) => void;
  readonly onWireFrame?: (event: WireFrameEvent) => void;
}

interface AwarenessUpdateChanges {
  readonly added: number[];
  readonly updated: number[];
  readonly removed: number[];
}

/**
 * Lightweight `y-websocket` compatible client speaking `y-protocols/sync` (tag 0)
 * and `y-protocols/awareness` (tag 1) with exponential reconnect backoff.
 */
export class YjsA2uiSocket {
  private ws: WebSocket | null = null;
  private disposed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;

  private readonly handleDocUpdate = (update: Uint8Array, origin: string | object | null) => {
    if (origin === REMOTE_YJS_ORIGIN) return;
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_SYNC);
    syncProtocol.writeUpdate(enc, update);
    this.sendBinary(encoding.toUint8Array(enc), 'sync');
  };

  private readonly handleAwarenessUpdate = (
    changes: AwarenessUpdateChanges,
    origin: string | object | null,
  ) => {
    if (origin === REMOTE_YJS_ORIGIN) return;
    const changedClients = [...changes.added, ...changes.updated, ...changes.removed];
    if (changedClients.length === 0) return;
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(this.options.awareness, changedClients),
    );
    this.sendBinary(encoding.toUint8Array(enc), 'awareness');
  };

  constructor(private readonly options: YjsA2uiSocketOptions) {
    this.options.doc.on('update', this.handleDocUpdate);
    this.options.awareness.on('update', this.handleAwarenessUpdate);
    this.connect();
  }

  private connect(): void {
    if (this.disposed || typeof WebSocket === 'undefined') return;
    try {
      const socket = new WebSocket(this.options.url);
      socket.binaryType = 'arraybuffer';
      this.ws = socket;

      socket.addEventListener('open', () => {
        if (this.disposed || this.ws !== socket) return;
        this.reconnectAttempt = 0;
        this.options.onConnectionChange?.(true);

        // Send SyncStep1 handshake.
        const step1 = encoding.createEncoder();
        encoding.writeVarUint(step1, MESSAGE_SYNC);
        syncProtocol.writeSyncStep1(step1, this.options.doc);
        this.sendBinary(encoding.toUint8Array(step1), 'sync');

        // Announce local awareness presence immediately if populated.
        if (this.options.awareness.getLocalState() !== null) {
          const awEnc = encoding.createEncoder();
          encoding.writeVarUint(awEnc, MESSAGE_AWARENESS);
          encoding.writeVarUint8Array(
            awEnc,
            awarenessProtocol.encodeAwarenessUpdate(this.options.awareness, [
              this.options.doc.clientID,
            ]),
          );
          this.sendBinary(encoding.toUint8Array(awEnc), 'awareness');
        }
      });

      socket.addEventListener('message', (ev: MessageEvent) => {
        if (this.disposed || this.ws !== socket) return;
        if (!(ev.data instanceof ArrayBuffer)) return;
        this.handleInboundFrame(new Uint8Array(ev.data));
      });

      socket.addEventListener('close', () => {
        if (this.ws === socket) {
          this.ws = null;
          this.options.onConnectionChange?.(false);
        }
        this.scheduleReconnect();
      });

      socket.addEventListener('error', () => {
        socket.close();
      });
    } catch {
      this.options.onConnectionChange?.(false);
      this.scheduleReconnect();
    }
  }

  private handleInboundFrame(frame: Uint8Array): void {
    if (frame.byteLength === 0) return;
    const dec = decoding.createDecoder(frame);
    const msgType = decoding.readVarUint(dec);
    if (msgType === MESSAGE_SYNC) {
      this.emitWire('in', 'sync', frame.byteLength);
      const reply = encoding.createEncoder();
      encoding.writeVarUint(reply, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(dec, reply, this.options.doc, REMOTE_YJS_ORIGIN);
      if (encoding.length(reply) > 1) {
        this.sendBinary(encoding.toUint8Array(reply), 'sync');
      }
    } else if (msgType === MESSAGE_AWARENESS) {
      this.emitWire('in', 'awareness', frame.byteLength);
      awarenessProtocol.applyAwarenessUpdate(
        this.options.awareness,
        decoding.readVarUint8Array(dec),
        REMOTE_YJS_ORIGIN,
      );
    }
  }

  private sendBinary(bytes: Uint8Array, kind: 'sync' | 'awareness'): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(new Uint8Array(bytes));
    this.emitWire('out', kind, bytes.byteLength);
  }

  private emitWire(direction: 'in' | 'out', kind: 'sync' | 'awareness', byteLength: number): void {
    this.options.onWireFrame?.({
      timestamp: new Date().toISOString().slice(11, 23),
      direction,
      kind,
      byteLength,
    });
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectTimer !== null) return;
    const delayMs = Math.min(4000, 250 * Math.pow(1.8, this.reconnectAttempt));
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.options.doc.off('update', this.handleDocUpdate);
    this.options.awareness.off('update', this.handleAwarenessUpdate);
    if (this.ws) {
      try {
        awarenessProtocol.removeAwarenessStates(
          this.options.awareness,
          [this.options.doc.clientID],
          'disconnect',
        );
      } catch {
        // Ignore teardown errors.
      }
      this.ws.close();
      this.ws = null;
    }
  }
}
