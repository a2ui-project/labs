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

import {describe, it, expect, vi} from 'vitest';
import {
  formatSseEvent,
  formatSseKeepalive,
  formatWsEvent,
  parseSnapshotLineArray,
  parseWsEvent,
  STREAM_EVENT_LINE,
  STREAM_EVENT_RESET,
  STREAM_EVENT_SNAPSHOT,
  STREAM_SSE_PATH,
  STREAM_WS_PATH,
  StreamEvent,
} from './stream-events.js';
import {StoreLine} from './store.js';

describe('SSE framing and events', () => {
  const sampleLine: StoreLine = {
    seq: 42,
    callId: 'call_1',
    ts: '2026-09-30T20:00:00.000Z',
    message: {
      version: 'v0.9',
      updateDataModel: {
        surfaceId: 'surf',
        path: '/count',
        value: 5,
      },
    },
  };

  it('formats line event with id', () => {
    const event: StreamEvent = {type: STREAM_EVENT_LINE, line: sampleLine};
    const frame = formatSseEvent(event, 42);
    expect(frame).toBe(`event: line\nid: 42\ndata: ${JSON.stringify(sampleLine)}\n\n`);
  });

  it('formats reset event without id', () => {
    const event: StreamEvent = {type: STREAM_EVENT_RESET};
    const frame = formatSseEvent(event);
    expect(frame).toBe('event: reset\ndata: {}\n\n');
  });

  it('formats snapshot event with all lines in one data frame', () => {
    const second: StoreLine = {...sampleLine, seq: 43};
    const event: StreamEvent = {
      type: STREAM_EVENT_SNAPSHOT,
      lines: [sampleLine, second],
    };
    const frame = formatSseEvent(event, 43);
    expect(frame).toBe(
      `event: snapshot\nid: 43\ndata: ${JSON.stringify({lines: [sampleLine, second]})}\n\n`,
    );
    const data = JSON.parse(frame.split('\n')[2].slice('data: '.length));
    expect(data.lines.map((l: StoreLine) => l.seq)).toEqual([42, 43]);
  });

  it('formats an empty snapshot event', () => {
    const frame = formatSseEvent({type: STREAM_EVENT_SNAPSHOT, lines: []});
    expect(frame).toBe('event: snapshot\ndata: {"lines":[]}\n\n');
  });

  it('formats keepalive comment', () => {
    expect(formatSseKeepalive()).toBe(': keepalive\n\n');
  });

  it('exports stream endpoint path constants', () => {
    expect(STREAM_SSE_PATH).toBe('/api/stream');
    expect(STREAM_WS_PATH).toBe('/api/ws');
  });
});

describe('WebSocket framing and event parsing', () => {
  const sampleLine: StoreLine = {
    seq: 42,
    callId: 'call_1',
    ts: '2026-09-30T20:00:00.000Z',
    message: {
      version: 'v0.9',
      updateDataModel: {
        surfaceId: 'surf',
        path: '/count',
        value: 5,
      },
    },
  };

  it('round-trips line, snapshot, and reset events', () => {
    const lineEvent: StreamEvent = {
      type: STREAM_EVENT_LINE,
      line: sampleLine,
    };
    expect(parseWsEvent(formatWsEvent(lineEvent))).toEqual(lineEvent);

    const snapshotEvent: StreamEvent = {
      type: STREAM_EVENT_SNAPSHOT,
      lines: [sampleLine],
    };
    expect(parseWsEvent(formatWsEvent(snapshotEvent))).toEqual(snapshotEvent);

    const resetEvent: StreamEvent = {type: STREAM_EVENT_RESET};
    expect(parseWsEvent(formatWsEvent(resetEvent))).toEqual(resetEvent);
  });

  it('skips malformed lines in parseSnapshotLineArray and snapshot WebSocket frames', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mixed = [sampleLine, {seq: -1, bad: true}, null, {...sampleLine, seq: 43}];
    const parsed = parseSnapshotLineArray(mixed);
    expect(parsed.map(l => l.seq)).toEqual([42, 43]);
    expect(errSpy).toHaveBeenCalledTimes(2);

    const wsSnapshot = parseWsEvent(JSON.stringify({type: STREAM_EVENT_SNAPSHOT, lines: mixed}));
    expect(wsSnapshot).toEqual({
      type: STREAM_EVENT_SNAPSHOT,
      lines: [sampleLine, {...sampleLine, seq: 43}],
    });
    errSpy.mockRestore();
  });

  it('throws on malformed WebSocket frames, missing lines array, or unknown types', () => {
    expect(() => parseWsEvent('')).toThrow(/non-empty string/);
    expect(() => parseWsEvent('{not json')).toThrow();
    expect(() => parseWsEvent('[]')).toThrow(/JSON object/);
    expect(() => parseWsEvent(JSON.stringify({type: STREAM_EVENT_SNAPSHOT, lines: 'no'}))).toThrow(
      /no lines array/,
    );
    expect(() => parseWsEvent(JSON.stringify({type: STREAM_EVENT_LINE, line: {seq: 0}}))).toThrow();
    expect(() => parseWsEvent(JSON.stringify({type: 'ping'}))).toThrow(/Unknown WebSocket event/);
  });
});
