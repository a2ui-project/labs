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

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {
  StreamClient,
  StreamClientOptions,
  StreamTransport,
  ConnectionStatus,
  BUILD_RELOAD_MIN_INTERVAL_MS,
  BUILD_RELOAD_STORAGE_KEY,
  resolveWsUrl,
} from '../src/stream-client.js';
import {LineApplier} from '@a2ui-pane/renderer';
import {serializeStoreLine, StoreLine} from '@a2ui-pane/protocol';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  triggerOpen() {
    this.onopen?.(new Event('open'));
  }

  triggerMessage(data: string) {
    this.onmessage?.(new MessageEvent('message', {data}));
  }

  triggerError(err = new Event('error')) {
    this.onerror?.(err);
  }

  triggerClose(evt = new Event('close')) {
    this.onclose?.(evt);
  }

  close() {
    this.closed = true;
  }
}

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private listeners: Map<string, Array<(event: any) => void>> = new Map();
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: any) => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      list.filter(l => l !== listener),
    );
  }

  emit(type: string, eventData: any) {
    const list = this.listeners.get(type) ?? [];
    for (const listener of list) {
      listener(eventData);
    }
  }

  triggerOpen() {
    this.onopen?.(new Event('open'));
  }

  triggerError(err = new Event('error')) {
    this.onerror?.(err);
  }

  close() {
    this.closed = true;
  }
}

describe('StreamClient', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
  });

  it('connects to stream with conversationId and token in query params', () => {
    MockEventSource.instances = [];
    const applier = new LineApplier();
    const statusChanges: ConnectionStatus[] = [];

    const client = new StreamClient({
      conversationId: 'conv_123',
      token: 'secret-token',
      baseUrl: 'http://localhost:3000/api/stream',
      applier,
      onStatusChange: status => statusChanges.push(status),
      eventSourceFactory: url => new MockEventSource(url) as any,
    });

    client.connect();

    expect(MockEventSource.instances).toHaveLength(1);
    const es = MockEventSource.instances[0];
    expect(es.url).toContain('conversationId=conv_123');
    expect(es.url).toContain('token=secret-token');
    expect(statusChanges).toEqual(['connecting']);
    expect(client.getStatus()).toBe('connecting');

    es.triggerOpen();
    expect(statusChanges).toEqual(['connecting', 'connected']);
    expect(client.getStatus()).toBe('connected');
  });

  it('receives line event, parses JSON, and forwards to applier', () => {
    MockEventSource.instances = [];
    const applier = new LineApplier();
    const applySpy = vi.spyOn(applier, 'apply');

    const client = new StreamClient({
      conversationId: 'conv_abc',
      applier,
      eventSourceFactory: url => new MockEventSource(url) as any,
    });

    client.connect();
    const es = MockEventSource.instances[0];

    const storeLine: StoreLine = {
      seq: 1,
      ts: new Date().toISOString(),
      callId: 'call_1',
      message: {
        version: 'v0.9',
        createSurface: {surfaceId: 'surf1', catalogId: 'basic'},
      },
    };

    es.emit('line', {data: serializeStoreLine(storeLine).trim()});

    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenCalledWith([storeLine]);
  });

  it('handles malformed line event gracefully without crashing', () => {
    MockEventSource.instances = [];
    const applier = new LineApplier();
    const applySpy = vi.spyOn(applier, 'apply');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const client = new StreamClient({
      conversationId: 'conv_abc',
      applier,
      eventSourceFactory: url => new MockEventSource(url) as any,
    });

    client.connect();
    const es = MockEventSource.instances[0];

    es.emit('line', {data: 'invalid-json'});

    expect(applySpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('reconciles the applier with a snapshot event', () => {
    const applier = new LineApplier();
    const reconcileSpy = vi.spyOn(applier, 'reconcile');
    const client = new StreamClient({
      conversationId: 'conv_snap',
      applier,
      eventSourceFactory: url => new MockEventSource(url) as any,
    });
    client.connect();
    const es = MockEventSource.instances[0];

    const line: StoreLine = {
      seq: 7,
      ts: '2026-11-04T00:00:00.000Z',
      callId: 'call_1',
      message: {
        version: 'v0.9',
        createSurface: {surfaceId: 'snap', catalogId: 'basic'},
      },
    };
    es.emit('snapshot', {data: JSON.stringify({lines: [line]})});

    expect(reconcileSpy).toHaveBeenCalledWith([line]);
    expect(applier.getProcessor().getSurface('snap')).toBeDefined();
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it('reconciles an empty snapshot by clearing every surface', () => {
    const applier = new LineApplier();
    applier.apply([
      {
        seq: 1,
        ts: '2026-11-04T00:00:00.000Z',
        callId: 'call_1',
        message: {
          version: 'v0.9',
          createSurface: {surfaceId: 'old', catalogId: 'basic'},
        },
      },
    ]);
    const client = new StreamClient({
      conversationId: 'conv_snap_empty',
      applier,
      eventSourceFactory: url => new MockEventSource(url) as any,
    });
    client.connect();
    MockEventSource.instances[0].emit('snapshot', {data: '{"lines":[]}'});
    expect(applier.getProcessor().getSurface('old')).toBeUndefined();
  });

  it('ignores a malformed snapshot event', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const applier = new LineApplier();
    const reconcileSpy = vi.spyOn(applier, 'reconcile');
    const client = new StreamClient({
      conversationId: 'conv_snap_bad',
      applier,
      eventSourceFactory: url => new MockEventSource(url) as any,
    });
    client.connect();
    const es = MockEventSource.instances[0];
    es.emit('snapshot', {data: 'not-json'});
    es.emit('snapshot', {data: '{"lines":"nope"}'});
    expect(reconcileSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });

  it('skips a malformed snapshot line and still reconciles the rest', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const applier = new LineApplier();
    applier.apply([
      {
        seq: 1,
        ts: '2026-11-04T00:00:00.000Z',
        callId: 'call_1',
        message: {
          version: 'v0.9',
          createSurface: {surfaceId: 'gone', catalogId: 'basic'},
        },
      },
    ]);
    const reconcileSpy = vi.spyOn(applier, 'reconcile');
    const client = new StreamClient({
      conversationId: 'conv_snap_partial',
      applier,
      eventSourceFactory: url => new MockEventSource(url) as any,
    });
    client.connect();
    const good: StoreLine = {
      seq: 2,
      ts: '2026-11-04T00:00:00.000Z',
      callId: 'call_2',
      message: {
        version: 'v0.9',
        createSurface: {surfaceId: 'kept', catalogId: 'basic'},
      },
    };
    MockEventSource.instances[0].emit('snapshot', {
      data: JSON.stringify({lines: [{seq: 'x'}, good]}),
    });
    expect(reconcileSpy).toHaveBeenCalledWith([good]);
    expect(applier.getProcessor().getSurface('gone')).toBeUndefined();
    expect(applier.getProcessor().getSurface('kept')).toBeDefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('handles reset event by resetting applier and reopening stream', () => {
    MockEventSource.instances = [];
    const applier = new LineApplier();
    const resetSpy = vi.spyOn(applier, 'reset');

    const client = new StreamClient({
      conversationId: 'conv_reset',
      applier,
      eventSourceFactory: url => new MockEventSource(url) as any,
    });

    client.connect();
    expect(MockEventSource.instances).toHaveLength(1);
    const firstEs = MockEventSource.instances[0];

    firstEs.emit('reset', {});

    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(firstEs.closed).toBe(true);
    // Should have opened a new EventSource instance
    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[1].closed).toBe(false);
  });

  it('transitions to reconnecting on error and invokes onError callback', () => {
    MockEventSource.instances = [];
    const applier = new LineApplier();
    const errorSpy = vi.fn();
    const statusChanges: ConnectionStatus[] = [];

    const client = new StreamClient({
      conversationId: 'conv_err',
      applier,
      onError: errorSpy,
      onStatusChange: s => statusChanges.push(s),
      eventSourceFactory: url => new MockEventSource(url) as any,
    });

    client.connect();
    const es = MockEventSource.instances[0];
    es.triggerOpen();

    const errEvent = new Event('error');
    es.triggerError(errEvent);

    expect(errorSpy).toHaveBeenCalledWith(errEvent);
    expect(client.getStatus()).toBe('reconnecting');
  });

  it('disconnects explicitly and closes active EventSource', () => {
    MockEventSource.instances = [];
    const applier = new LineApplier();
    const statusChanges: ConnectionStatus[] = [];

    const client = new StreamClient({
      conversationId: 'conv_disc',
      applier,
      onStatusChange: s => statusChanges.push(s),
      eventSourceFactory: url => new MockEventSource(url) as any,
    });

    client.connect();
    const es = MockEventSource.instances[0];
    expect(es.closed).toBe(false);

    client.disconnect();
    expect(es.closed).toBe(true);
    expect(client.getStatus()).toBe('disconnected');

    // Triggering error after disconnect should not change status to reconnecting
    es.triggerError();
    expect(client.getStatus()).toBe('disconnected');
  });

  it('uses default baseUrl ./api/stream when omitted', () => {
    const applier = new LineApplier();
    const client = new StreamClient({
      conversationId: 'default_base',
      applier,
      eventSourceFactory: url => new MockEventSource(url) as any,
    });
    client.connect();
    const es = MockEventSource.instances[MockEventSource.instances.length - 1];
    expect(es.url).toMatch(/^\.\/api\/stream\?/);
  });

  it('handles error safely when onError is omitted', () => {
    const applier = new LineApplier();
    const client = new StreamClient({
      conversationId: 'no_err_cb',
      applier,
      eventSourceFactory: url => new MockEventSource(url) as any,
    });
    client.connect();
    const es = MockEventSource.instances[MockEventSource.instances.length - 1];
    expect(() => es.triggerError()).not.toThrow();
    expect(client.getStatus()).toBe('reconnecting');
  });

  it('schedules reconnect timer when EventSource enters fatal CLOSED state (M7)', () => {
    vi.useFakeTimers();
    MockEventSource.instances = [];
    const applier = new LineApplier();

    const client = new StreamClient({
      conversationId: 'fatal_closed_conv',
      applier,
      reconnectDelayMs: 500,
      eventSourceFactory: url => new MockEventSource(url) as any,
    });

    client.connect();
    expect(MockEventSource.instances).toHaveLength(1);
    const es = MockEventSource.instances[0] as any;
    es.readyState = 2; // EventSource.CLOSED

    es.triggerError();
    expect(client.getStatus()).toBe('reconnecting');

    vi.advanceTimersByTime(500);
    expect(MockEventSource.instances).toHaveLength(2);

    client.disconnect();
    vi.useRealTimers();
  });

  describe('build change detection', () => {
    const flush = () => new Promise(resolve => setTimeout(resolve, 0));

    function memoryStorage(initial: Record<string, string> = {}) {
      const map = new Map(Object.entries(initial));
      return {
        map,
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => void map.set(key, value),
      };
    }

    function setup(buildIds: string[], storage = memoryStorage()) {
      let call = 0;
      const fetchImpl = vi.fn(async () => {
        const buildId = buildIds[Math.min(call++, buildIds.length - 1)];
        return {
          ok: true,
          json: async () => ({conversationId: 'c', buildId}),
        } as Response;
      });
      const onBuildChanged = vi.fn();
      const client = new StreamClient({
        conversationId: 'conv_build',
        applier: new LineApplier(),
        eventSourceFactory: url => new MockEventSource(url) as any,
        fetchImpl,
        storage,
        onBuildChanged,
      });
      client.connect();
      return {client, fetchImpl, onBuildChanged, storage};
    }

    async function reconnect(client: StreamClient) {
      const es = MockEventSource.instances[MockEventSource.instances.length - 1];
      es.triggerOpen();
      await flush();
      // A reset reopens the stream, which counts as a reconnect.
      es.emit('reset', {});
      MockEventSource.instances[MockEventSource.instances.length - 1].triggerOpen();
      await flush();
      return client;
    }

    it('fetches the config on every connect and stays quiet while buildId is unchanged', async () => {
      const {client, fetchImpl, onBuildChanged} = setup(['100', '100']);
      await reconnect(client);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(fetchImpl).toHaveBeenCalledWith('./api/config');
      expect(onBuildChanged).not.toHaveBeenCalled();
      client.disconnect();
    });

    it('fires onBuildChanged once when the served buildId changes', async () => {
      const {client, onBuildChanged, storage} = setup(['100', '200']);
      await reconnect(client);
      expect(onBuildChanged).toHaveBeenCalledTimes(1);
      expect(Number(storage.map.get(BUILD_RELOAD_STORAGE_KEY))).toBeGreaterThan(0);
      client.disconnect();
    });

    it('does not fire again for a second change within the reload window', async () => {
      const {client, onBuildChanged} = setup(['100', '200', '300']);
      await reconnect(client);
      MockEventSource.instances[MockEventSource.instances.length - 1].triggerOpen();
      await flush();
      expect(onBuildChanged).toHaveBeenCalledTimes(1);
      client.disconnect();
    });

    it('honors a recent reload recorded in storage by a previous page', async () => {
      const recent = memoryStorage({
        [BUILD_RELOAD_STORAGE_KEY]: String(Date.now() - 1_000),
      });
      const {client, onBuildChanged} = setup(['100', '200'], recent);
      await reconnect(client);
      expect(onBuildChanged).not.toHaveBeenCalled();
      client.disconnect();

      MockEventSource.instances = [];
      const old = memoryStorage({
        [BUILD_RELOAD_STORAGE_KEY]: String(Date.now() - BUILD_RELOAD_MIN_INTERVAL_MS - 1_000),
      });
      const second = setup(['100', '200'], old);
      await reconnect(second.client);
      expect(second.onBuildChanged).toHaveBeenCalledTimes(1);
      second.client.disconnect();
    });

    it('ignores a config response without buildId or a failing fetch', async () => {
      const onBuildChanged = vi.fn();
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({conversationId: 'c'}),
        } as Response)
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({}),
        } as Response);
      const client = new StreamClient({
        conversationId: 'conv_build',
        applier: new LineApplier(),
        eventSourceFactory: url => new MockEventSource(url) as any,
        fetchImpl,
        storage: memoryStorage(),
        onBuildChanged,
      });
      client.connect();
      for (let i = 0; i < 3; i++) {
        MockEventSource.instances[MockEventSource.instances.length - 1].triggerOpen();
        await flush();
      }
      expect(fetchImpl).toHaveBeenCalledTimes(3);
      expect(onBuildChanged).not.toHaveBeenCalled();
      client.disconnect();
    });
  });

  describe('WebSocket transport', () => {
    const flush = () => new Promise(resolve => setTimeout(resolve, 0));

    const createLine = (seq: number, surfaceId: string): StoreLine => ({
      seq,
      ts: '2026-11-04T00:00:00.000Z',
      callId: `call_${seq}`,
      message: {
        version: 'v0.9',
        createSurface: {surfaceId, catalogId: 'basic'},
      },
    });

    function setup(overrides: Partial<StreamClientOptions> = {}) {
      const applier = new LineApplier();
      const statuses: ConnectionStatus[] = [];
      const transports: StreamTransport[] = [];
      const onError = vi.fn();
      const client = new StreamClient({
        conversationId: 'conv_ws',
        token: 'tok_ws',
        applier,
        reconnectDelayMs: 500,
        wsBaseUrl: 'http://pane.test/api/ws',
        onStatusChange: s => statuses.push(s),
        onTransportChange: t => transports.push(t),
        onError,
        webSocketFactory: url => new MockWebSocket(url) as any,
        eventSourceFactory: url => new MockEventSource(url) as any,
        ...overrides,
      });
      return {client, applier, statuses, transports, onError};
    }

    const lastWs = () => MockWebSocket.instances[MockWebSocket.instances.length - 1];

    beforeEach(() => {
      MockWebSocket.instances = [];
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('resolveWsUrl', () => {
      it('maps http to ws and https to wss relative to the page URL', () => {
        expect(resolveWsUrl('./api/ws', 'c1', undefined, 'http://host:8080/pane/index.html')).toBe(
          'ws://host:8080/pane/api/ws?conversationId=c1',
        );
        expect(resolveWsUrl('./api/ws', 'c1', 'tok', 'https://host/pane/')).toBe(
          'wss://host/pane/api/ws?conversationId=c1&token=tok',
        );
      });

      it('uses an explicit ws:// or wss:// base as is', () => {
        expect(resolveWsUrl('ws://other:9/api/ws', 'c 2', undefined, 'https://host/')).toBe(
          'ws://other:9/api/ws?conversationId=c+2',
        );
        expect(resolveWsUrl('wss://other/api/ws', 'c3', 't', 'http://host/')).toBe(
          'wss://other/api/ws?conversationId=c3&token=t',
        );
      });

      it('resolves against the page location by default', () => {
        const url = new URL(resolveWsUrl('./api/ws', 'c4'));
        expect(url.protocol).toMatch(/^wss?:$/);
        expect(url.pathname).toMatch(/\/api\/ws$/);
        expect(url.searchParams.get('conversationId')).toBe('c4');
      });
    });

    it('connects over WebSocket with conversationId and token and reports the transport', () => {
      const {client, statuses, transports} = setup();
      client.connect();

      expect(MockEventSource.instances).toHaveLength(0);
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(lastWs().url).toBe('ws://pane.test/api/ws?conversationId=conv_ws&token=tok_ws');
      expect(client.getStatus()).toBe('connecting');
      expect(client.getTransport()).toBeNull();

      lastWs().triggerOpen();
      expect(statuses).toEqual(['connecting', 'connected']);
      expect(transports).toEqual(['websocket']);
      expect(client.getTransport()).toBe('websocket');
      client.disconnect();
    });

    it('uses the WebSocket over https as wss', () => {
      const {client} = setup({wsBaseUrl: 'https://pane.test/api/ws'});
      client.connect();
      expect(lastWs().url).toMatch(/^wss:\/\/pane\.test\/api\/ws\?/);
      client.disconnect();
    });

    it('stays on SSE when only an eventSourceFactory is given', () => {
      const {client} = setup({webSocketFactory: undefined});
      client.connect();
      expect(MockWebSocket.instances).toHaveLength(0);
      expect(MockEventSource.instances).toHaveLength(1);
      client.disconnect();
    });

    it('applies snapshot and line frames and ignores malformed frames', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const {client, applier} = setup();
      const reconcileSpy = vi.spyOn(applier, 'reconcile');
      const applySpy = vi.spyOn(applier, 'apply');
      client.connect();
      const ws = lastWs();
      ws.triggerOpen();

      const snap = createLine(1, 'snap');
      ws.triggerMessage(JSON.stringify({type: 'snapshot', lines: [snap]}));
      expect(reconcileSpy).toHaveBeenCalledWith([snap]);
      expect(applier.getProcessor().getSurface('snap')).toBeDefined();

      const line = createLine(2, 'live');
      ws.triggerMessage(JSON.stringify({type: 'line', line}));
      expect(applySpy).toHaveBeenLastCalledWith([line]);
      expect(applier.getProcessor().getSurface('live')).toBeDefined();

      ws.triggerMessage('not-json');
      ws.triggerMessage(JSON.stringify({type: 'mystery'}));
      expect(errorSpy).toHaveBeenCalledTimes(2);
      errorSpy.mockRestore();
      client.disconnect();
    });

    it('resets the applier and reopens the WebSocket on a reset frame', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const {client, applier} = setup();
      const resetSpy = vi.spyOn(applier, 'reset');
      client.connect();
      const first = lastWs();
      first.triggerOpen();

      first.triggerMessage(JSON.stringify({type: 'reset'}));
      expect(resetSpy).toHaveBeenCalledTimes(1);
      expect(first.closed).toBe(true);
      expect(first.onclose).toBeNull();
      expect(MockWebSocket.instances).toHaveLength(2);
      warnSpy.mockRestore();
      client.disconnect();
    });

    it('checks the served build when the WebSocket opens', async () => {
      const fetchImpl = vi.fn(
        async () => ({ok: true, json: async () => ({buildId: 'b1'})}) as Response,
      );
      const {client} = setup({
        fetchImpl,
        onBuildChanged: vi.fn(),
        storage: undefined,
      });
      client.connect();
      expect(fetchImpl).not.toHaveBeenCalled();
      lastWs().triggerOpen();
      await flush();
      expect(fetchImpl).toHaveBeenCalledWith('./api/config');
      client.disconnect();
    });

    it('falls back to SSE at once when the WebSocket fails before opening', () => {
      vi.useFakeTimers();
      const {client, statuses, transports, onError} = setup();
      client.connect();
      const ws = lastWs();

      ws.triggerError();
      ws.triggerClose();

      expect(ws.closed).toBe(true);
      expect(MockEventSource.instances).toHaveLength(1);
      expect(MockEventSource.instances[0].url).toContain('conversationId=conv_ws');
      expect(transports).toEqual(['sse']);
      expect(client.getTransport()).toBe('sse');
      expect(onError).not.toHaveBeenCalled();
      expect(statuses).toEqual(['connecting']);

      MockEventSource.instances[0].triggerOpen();
      expect(statuses).toEqual(['connecting', 'connected']);
      expect(transports).toEqual(['sse']);

      // The fallback is permanent: a reset reopens SSE, not a WebSocket.
      vi.advanceTimersByTime(10_000);
      MockEventSource.instances[0].emit('reset', {});
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockEventSource.instances).toHaveLength(2);
      client.disconnect();
    });

    it('falls back to SSE when the WebSocket handshake times out', () => {
      vi.useFakeTimers();
      const {client, transports} = setup({wsConnectTimeoutMs: 1_000});
      client.connect();
      const ws = lastWs();

      vi.advanceTimersByTime(999);
      expect(MockEventSource.instances).toHaveLength(0);
      vi.advanceTimersByTime(1);

      expect(ws.closed).toBe(true);
      expect(ws.onopen).toBeNull();
      expect(transports).toEqual(['sse']);
      expect(MockEventSource.instances).toHaveLength(1);

      // A late close from the abandoned socket changes nothing.
      ws.triggerClose();
      expect(MockEventSource.instances).toHaveLength(1);
      client.disconnect();
    });

    it('falls back to SSE when the WebSocket constructor throws', () => {
      const {client, transports} = setup({
        webSocketFactory: () => {
          throw new SyntaxError('bad url');
        },
      });
      client.connect();
      expect(transports).toEqual(['sse']);
      expect(MockEventSource.instances).toHaveLength(1);
      client.disconnect();
    });

    it('reconnects over WebSocket after a drop and resets the failure count on open', () => {
      vi.useFakeTimers();
      const {client, statuses, onError} = setup();
      client.connect();
      lastWs().triggerOpen();

      const closeEvent = new Event('close');
      lastWs().triggerClose(closeEvent);
      expect(client.getStatus()).toBe('reconnecting');
      expect(onError).toHaveBeenCalledWith(closeEvent);
      expect(MockWebSocket.instances).toHaveLength(1);

      vi.advanceTimersByTime(500);
      expect(MockWebSocket.instances).toHaveLength(2);
      lastWs().triggerOpen();
      expect(statuses).toEqual(['connecting', 'connected', 'reconnecting', 'connected']);

      // Two more drops after a successful reopen still stay on WebSocket.
      for (let i = 0; i < 2; i++) {
        lastWs().triggerClose();
        vi.advanceTimersByTime(500);
      }
      expect(MockWebSocket.instances).toHaveLength(4);
      expect(MockEventSource.instances).toHaveLength(0);
      expect(client.getTransport()).toBe('websocket');
      client.disconnect();
    });

    it('falls back to SSE after three consecutive WebSocket failures', () => {
      vi.useFakeTimers();
      const {client, transports} = setup();
      client.connect();
      lastWs().triggerOpen();

      lastWs().triggerClose();
      vi.advanceTimersByTime(500);
      lastWs().triggerError();
      lastWs().triggerClose();
      vi.advanceTimersByTime(500);
      expect(MockWebSocket.instances).toHaveLength(3);
      expect(MockEventSource.instances).toHaveLength(0);

      lastWs().triggerClose();
      expect(transports).toEqual(['websocket', 'sse']);
      expect(MockEventSource.instances).toHaveLength(1);

      vi.advanceTimersByTime(10_000);
      expect(MockWebSocket.instances).toHaveLength(3);
      client.disconnect();
    });

    it('disconnect clears timers and detaches WebSocket handlers', () => {
      vi.useFakeTimers();
      const {client, statuses} = setup();
      client.connect();
      const first = lastWs();

      client.disconnect();
      expect(first.closed).toBe(true);
      expect(first.onopen).toBeNull();
      expect(first.onmessage).toBeNull();
      expect(first.onerror).toBeNull();
      expect(first.onclose).toBeNull();
      expect(client.getStatus()).toBe('disconnected');

      // The handshake timer no longer fires a fallback.
      vi.advanceTimersByTime(10_000);
      expect(MockEventSource.instances).toHaveLength(0);

      // A pending reconnect timer is cleared too.
      client.connect();
      lastWs().triggerOpen();
      lastWs().triggerClose();
      client.disconnect();
      vi.advanceTimersByTime(10_000);
      expect(MockWebSocket.instances).toHaveLength(2);
      expect(statuses[statuses.length - 1]).toBe('disconnected');
    });

    it('uses the global WebSocket when no factory is given', () => {
      const original = (globalThis as any).WebSocket;
      (globalThis as any).WebSocket = MockWebSocket;
      try {
        const client = new StreamClient({
          conversationId: 'conv_global',
          applier: new LineApplier(),
        });
        client.connect();
        expect(MockWebSocket.instances).toHaveLength(1);
        expect(lastWs().url).toContain('/api/ws?conversationId=conv_global');
        client.disconnect();
      } finally {
        (globalThis as any).WebSocket = original;
      }
    });
  });
});
