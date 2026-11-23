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

import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import EventEmitter from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {parseWsEvent, type A2uiServerMessage, type StreamEvent} from '@a2ui-pane/protocol';
import {SurfaceStore} from '@a2ui-pane/protocol/store-fs';
import {handleWsStream} from '../src/ws-route.js';
import {StoreReader} from '../src/store-reader.js';
import {ChangeNotifier} from '../src/change-notifier.js';

class MockWebSocket extends EventEmitter {
  readyState: number = WebSocket.OPEN;
  readonly sent: string[] = [];

  send = vi.fn((data: string) => {
    this.sent.push(data);
  });

  ping = vi.fn(() => {});

  terminate = vi.fn(() => {
    this.readyState = WebSocket.CLOSED;
  });

  parsedEvents(): StreamEvent[] {
    return this.sent.map(raw => parseWsEvent(raw));
  }
}

const create = (surfaceId: string): A2uiServerMessage => ({
  version: '1.0',
  createSurface: {surfaceId, catalogId: 'basic'},
});

describe('handleWsStream', () => {
  let tmpDir: string;
  let store: SurfaceStore;
  let storeReader: StoreReader;
  let notifier: ChangeNotifier;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-route-test-'));
    store = new SurfaceStore(tmpDir);
    storeReader = new StoreReader(tmpDir);
    notifier = new ChangeNotifier(tmpDir, 50);
  });

  afterEach(() => {
    vi.useRealTimers();
    notifier.close();
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  const connect = (convId: string, keepaliveIntervalMs = 1000) => {
    const ws = new MockWebSocket();
    handleWsStream(ws as unknown as WebSocket, convId, storeReader, notifier, {
      keepaliveIntervalMs,
    });
    return ws;
  };

  it('sends one snapshot frame on connect with all live surfaces', () => {
    store.commit('conv_ws', 'c1', [create('s1'), create('s2')]);

    const ws = connect('conv_ws');
    const events = ws.parsedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('snapshot');
    if (events[0].type === 'snapshot') {
      expect(events[0].lines.map(l => l.seq)).toEqual([1, 2]);
    }
    ws.emit('close');
  });

  it('sends an empty snapshot frame for a conversation with no surfaces', () => {
    const ws = connect('conv_empty');
    expect(ws.parsedEvents()).toEqual([{type: 'snapshot', lines: []}]);
    ws.emit('close');
  });

  it('subscribes before taking the snapshot', () => {
    const order: string[] = [];
    const subscribe = vi.spyOn(notifier, 'subscribe').mockImplementation(() => {
      order.push('subscribe');
      return () => {};
    });
    const snapshot = vi.spyOn(storeReader, 'snapshot').mockImplementation(() => {
      order.push('snapshot');
      return [];
    });

    const ws = connect('conv_order');
    expect(order).toEqual(['subscribe', 'snapshot']);
    ws.emit('close');
    subscribe.mockRestore();
    snapshot.mockRestore();
  });

  it('does not resend a write that landed between subscribe and snapshot', () => {
    const realSubscribe = notifier.subscribe.bind(notifier);
    vi.spyOn(notifier, 'subscribe').mockImplementation((convId, cb) => {
      const unsubscribe = realSubscribe(convId, cb);
      store.commit(convId, 'c-race', [create('raced')]);
      return unsubscribe;
    });

    const ws = connect('conv_race');
    (notifier as any).notify('conv_race');

    const events = ws.parsedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('snapshot');
    if (events[0].type === 'snapshot') {
      expect((events[0].lines[0].message as any).createSurface.surfaceId).toBe('raced');
    }
    ws.emit('close');
  });

  it('streams incremental line diffs and delete tombstones', () => {
    store.commit('conv_live', 'c1', [create('a'), create('b')]);
    const ws = connect('conv_live');

    store.commit('conv_live', 'c2', [
      {
        version: '1.0',
        updateDataModel: {surfaceId: 'a', path: '/x', value: 1},
      },
    ]);
    (notifier as any).notify('conv_live');

    let events = ws.parsedEvents();
    expect(events).toHaveLength(2);
    expect(events[1].type).toBe('line');
    if (events[1].type === 'line') {
      expect(events[1].line.seq).toBe(3);
      expect((events[1].line.message as any).createSurface.dataModel).toEqual({
        x: 1,
      });
    }

    // A tick with no change sends nothing.
    (notifier as any).notify('conv_live');
    expect(ws.parsedEvents()).toHaveLength(2);

    store.deleteSurface('conv_live', 'b', 'call_pane_dismissed_1');
    (notifier as any).notify('conv_live');
    events = ws.parsedEvents();
    expect(events).toHaveLength(3);
    expect(events[2].type).toBe('line');
    if (events[2].type === 'line') {
      expect(events[2].line.seq).toBe(4);
      expect(events[2].line.message).toEqual({
        version: '1.0',
        deleteSurface: {surfaceId: 'b'},
      });
    }

    ws.emit('close');
  });

  it('falls back to the first diff when the snapshot read fails', () => {
    store.commit('conv_fail', 'c1', [create('a')]);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const snapshot = vi.spyOn(storeReader, 'snapshot').mockImplementationOnce(() => {
      throw new Error('EACCES');
    });

    const ws = connect('conv_fail');
    expect(ws.sent).toEqual([]);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error reading snapshot'),
      expect.anything(),
    );

    (notifier as any).notify('conv_fail');
    const events = ws.parsedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('line');
    if (events[0].type === 'line') {
      expect(events[0].line.seq).toBe(1);
    }

    ws.emit('close');
    snapshot.mockRestore();
    errSpy.mockRestore();
  });

  it('pings on keepalive interval, keeps alive on pong, and terminates unresponsive peers', () => {
    vi.useFakeTimers();
    const ws = connect('conv_ping', 100);

    // First tick sends ping and marks alive = false.
    vi.advanceTimersByTime(100);
    expect(ws.ping).toHaveBeenCalledTimes(1);
    expect(ws.terminate).not.toHaveBeenCalled();

    // Pong restores alive = true so next tick pings again.
    ws.emit('pong');
    vi.advanceTimersByTime(100);
    expect(ws.ping).toHaveBeenCalledTimes(2);
    expect(ws.terminate).not.toHaveBeenCalled();

    // Missing pong causes the following tick to terminate the peer.
    vi.advanceTimersByTime(100);
    expect(ws.terminate).toHaveBeenCalledTimes(1);
    expect(ws.ping).toHaveBeenCalledTimes(2);

    ws.emit('close');
  });

  it('handles send, ping, and terminate errors without crashing', () => {
    vi.useFakeTimers();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ws = new MockWebSocket();
    ws.send.mockImplementation(() => {
      throw new Error('Socket write failure');
    });
    ws.ping.mockImplementation(() => {
      throw new Error('Ping failure');
    });
    ws.terminate.mockImplementation(() => {
      throw new Error('Terminate failure');
    });

    handleWsStream(ws as unknown as WebSocket, 'conv_err', storeReader, notifier, {
      keepaliveIntervalMs: 50,
    });
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error reading snapshot'),
      expect.anything(),
    );

    store.commit('conv_err', 'c1', [create('a')]);
    expect(() => (notifier as any).notify('conv_err')).not.toThrow();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error processing update'),
      expect.anything(),
    );

    // First tick calls ping (throws, swallowed); second tick calls terminate (throws, swallowed).
    expect(() => vi.advanceTimersByTime(50)).not.toThrow();
    expect(() => vi.advanceTimersByTime(50)).not.toThrow();
    expect(ws.ping).toHaveBeenCalledTimes(1);
    expect(ws.terminate).toHaveBeenCalledTimes(1);

    ws.emit('close');
    errSpy.mockRestore();
  });

  it('skips send and ping when socket is not OPEN', () => {
    vi.useFakeTimers();
    store.commit('conv_closed', 'c1', [create('a')]);
    const ws = new MockWebSocket();
    ws.readyState = WebSocket.CLOSING;

    handleWsStream(ws as unknown as WebSocket, 'conv_closed', storeReader, notifier, {
      keepaliveIntervalMs: 50,
    });
    expect(ws.send).not.toHaveBeenCalled();

    store.commit('conv_closed', 'c2', [create('b')]);
    (notifier as any).notify('conv_closed');
    expect(ws.send).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(ws.ping).not.toHaveBeenCalled();

    ws.emit('close');
  });

  it('cleans up idempotently on error followed by close', () => {
    vi.useFakeTimers();
    const unsubSpy = vi.fn();
    const realSubscribe = notifier.subscribe.bind(notifier);
    const subSpy = vi.spyOn(notifier, 'subscribe').mockImplementation((convId, cb) => {
      const realUnsub = realSubscribe(convId, cb);
      return () => {
        unsubSpy();
        realUnsub();
      };
    });

    const ws = connect('conv_cleanup', 50);
    expect((notifier as any).listeners.has('conv_cleanup')).toBe(true);

    ws.emit('error', new Error('ECONNRESET'));
    ws.emit('close');

    expect(unsubSpy).toHaveBeenCalledTimes(1);
    expect((notifier as any).listeners.has('conv_cleanup')).toBe(false);

    // Timer was cleared so advancing time does not ping or terminate.
    vi.advanceTimersByTime(200);
    expect(ws.ping).not.toHaveBeenCalled();
    expect(ws.terminate).not.toHaveBeenCalled();

    subSpy.mockRestore();
  });
});
