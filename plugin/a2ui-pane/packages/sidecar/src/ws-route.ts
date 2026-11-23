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

import {WebSocket} from 'ws';
import {formatWsEvent, KEEPALIVE_INTERVAL_MS} from '@a2ui-pane/protocol';
import {knownFromLines, type KnownSurfaces, StoreReader} from './store-reader.js';
import {ChangeNotifier} from './change-notifier.js';

/** Configuration options for the `/api/ws` WebSocket handler. */
export interface WsStreamOptions {
  keepaliveIntervalMs?: number;
}

function sendIfOpen(ws: WebSocket, payload: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(payload);
  }
}

function startKeepalive(ws: WebSocket, intervalMs: number): NodeJS.Timeout {
  let alive = true;
  ws.on('pong', () => {
    alive = true;
  });

  return setInterval(() => {
    if (!alive) {
      try {
        ws.terminate();
      } catch {
        // Socket already terminated
      }
      return;
    }
    if (ws.readyState !== WebSocket.OPEN) return;
    alive = false;
    try {
      ws.ping();
    } catch {
      // Socket ping error
    }
  }, intervalMs);
}

/**
 * Handles an upgraded WebSocket connection for `/api/ws`.
 *
 * Mirrors `/api/stream` SSE semantics: subscribes before reading the initial
 * snapshot so concurrent writes are never missed, sends one `snapshot` frame
 * with every live surface, and streams incremental `line` frames (including
 * `deleteSurface` tombstones) on subsequent change notifications.
 */
export function handleWsStream(
  ws: WebSocket,
  conversationId: string,
  storeReader: StoreReader,
  notifier: ChangeNotifier,
  options: WsStreamOptions = {},
): void {
  const keepaliveMs = options.keepaliveIntervalMs ?? KEEPALIVE_INTERVAL_MS;
  let known: KnownSurfaces = new Map();

  // 1. Subscribe before taking the snapshot, so a write that lands in between
  // produces a tick whose diff sends it. A write the snapshot already holds
  // diffs to nothing.
  const unsubscribe = notifier.subscribe(conversationId, () => {
    try {
      const update = storeReader.diff(conversationId, known);
      known = update.known;
      for (const line of update.lines) {
        sendIfOpen(ws, formatWsEvent({type: 'line', line}));
      }
    } catch (err) {
      console.error(`[ws-route] Error processing update for ${conversationId}:`, err);
    }
  });

  // 2. Send the complete current set of surfaces.
  try {
    const lines = storeReader.snapshot(conversationId);
    known = knownFromLines(lines);
    sendIfOpen(ws, formatWsEvent({type: 'snapshot', lines}));
  } catch (err) {
    // The next tick's diff sends every surface, because `known` is still empty.
    console.error(`[ws-route] Error reading snapshot for ${conversationId}:`, err);
  }

  // 3. Ping/pong keepalive timer to detect half-open connections.
  const keepaliveTimer = startKeepalive(ws, keepaliveMs);

  // 4. Idempotent teardown on close or error.
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearInterval(keepaliveTimer);
    unsubscribe();
  };

  ws.on('close', cleanup);
  ws.on('error', cleanup);
}
