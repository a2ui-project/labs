/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {describe, it, expect} from 'vitest';
import {
  formatSseEvent,
  formatSseKeepalive,
  STREAM_EVENT_LINE,
  STREAM_EVENT_RESET,
  STREAM_EVENT_SNAPSHOT,
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
    const event: StreamEvent = {type: STREAM_EVENT_SNAPSHOT, lines: [sampleLine, second]};
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
});
