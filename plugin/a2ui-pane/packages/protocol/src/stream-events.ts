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

import {parseStoreLine, StoreLine} from './store.js';

/** HTTP path serving the Server-Sent Events stream. */
export const STREAM_SSE_PATH = '/api/stream';

/** HTTP upgrade path serving the WebSocket stream. */
export const STREAM_WS_PATH = '/api/ws';

/** SSE event type emitted when a new JSONL store line arrives. */
export const STREAM_EVENT_LINE = 'line';

/**
 * SSE event type emitted when the store file is truncated or replaced.
 *
 * The sidecar no longer sends it. It is kept for one release so that a pane
 * built before the per-surface store layout still handles it by reconnecting.
 */
export const STREAM_EVENT_RESET = 'reset';

/**
 * SSE event type carrying the complete current set of live surfaces, one
 * `StoreLine` per surface, sorted by seq. Sent once when a stream connects.
 */
export const STREAM_EVENT_SNAPSHOT = 'snapshot';

/** Interval in milliseconds between SSE keepalive comment frames. */
export const KEEPALIVE_INTERVAL_MS = 15_000;

/** Discriminated union of Server-Sent Events emitted by `/api/stream`. */
export type StreamEvent =
  | {type: typeof STREAM_EVENT_LINE; line: StoreLine}
  | {type: typeof STREAM_EVENT_SNAPSHOT; lines: StoreLine[]}
  | {type: typeof STREAM_EVENT_RESET};

/**
 * Formats a single SSE frame according to the W3C EventSource standard.
 */
export function formatSseEvent(event: StreamEvent, id?: number | string): string {
  let output = `event: ${event.type}\n`;
  if (id !== undefined && id !== null) {
    output += `id: ${id}\n`;
  }
  if (event.type === STREAM_EVENT_LINE) {
    output += `data: ${JSON.stringify(event.line)}\n\n`;
  } else if (event.type === STREAM_EVENT_SNAPSHOT) {
    output += `data: ${JSON.stringify({lines: event.lines})}\n\n`;
  } else {
    output += `data: {}\n\n`;
  }
  return output;
}

/**
 * Formats a keepalive SSE comment line.
 */
export function formatSseKeepalive(): string {
  return ': keepalive\n\n';
}

/**
 * Parses an array of raw snapshot entries into validated `StoreLine` items.
 *
 * Malformed entries are skipped and logged so one corrupt surface file cannot
 * prevent the pane from reconciling or removing surfaces deleted while offline.
 */
export function parseSnapshotLineArray(rawLines: unknown[]): StoreLine[] {
  const lines: StoreLine[] = [];
  for (const raw of rawLines) {
    try {
      lines.push(parseStoreLine(JSON.stringify(raw)));
    } catch (err) {
      console.error('[protocol] Skipping malformed snapshot line:', err);
    }
  }
  return lines;
}

/**
 * Formats a `StreamEvent` as a JSON text frame for the WebSocket stream.
 */
export function formatWsEvent(event: StreamEvent): string {
  if (event.type === STREAM_EVENT_LINE) {
    return JSON.stringify({type: STREAM_EVENT_LINE, line: event.line});
  }
  if (event.type === STREAM_EVENT_SNAPSHOT) {
    return JSON.stringify({type: STREAM_EVENT_SNAPSHOT, lines: event.lines});
  }
  return JSON.stringify({type: STREAM_EVENT_RESET});
}

/**
 * Parses and validates a JSON text frame received from the WebSocket stream.
 *
 * @throws {Error} When the frame is not valid JSON, lacks a recognized `type`,
 * or carries an invalid payload for that event type.
 */
export function parseWsEvent(raw: string): StreamEvent {
  if (!raw || typeof raw !== 'string') {
    throw new Error('WebSocket event must be a non-empty string');
  }
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('WebSocket event must be a JSON object');
  }
  if (parsed.type === STREAM_EVENT_LINE) {
    return {
      type: STREAM_EVENT_LINE,
      line: parseStoreLine(JSON.stringify(parsed.line)),
    };
  }
  if (parsed.type === STREAM_EVENT_SNAPSHOT) {
    if (!Array.isArray(parsed.lines)) {
      throw new Error('Snapshot WebSocket event has no lines array');
    }
    return {
      type: STREAM_EVENT_SNAPSHOT,
      lines: parseSnapshotLineArray(parsed.lines),
    };
  }
  if (parsed.type === STREAM_EVENT_RESET) {
    return {type: STREAM_EVENT_RESET};
  }
  throw new Error(`Unknown WebSocket event type: ${String(parsed.type)}`);
}
