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

import {
  STREAM_EVENT_LINE,
  STREAM_EVENT_RESET,
  STREAM_EVENT_SNAPSHOT,
  STREAM_SSE_PATH,
  STREAM_WS_PATH,
  StoreLine,
  StreamEvent,
  parseSnapshotLineArray,
  parseStoreLine,
  parseWsEvent,
} from '@a2ui-pane/protocol';
import {LineApplier} from '@a2ui-pane/renderer';

/** Lifecycle states of the connection to the sidecar stream endpoint. */
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

/** The transport carrying the stream: a WebSocket, or Server-Sent Events as the fallback. */
export type StreamTransport = 'websocket' | 'sse';

/** Minimum time between two build-change callbacks, so a flapping `buildId` cannot loop reloads. */
export const BUILD_RELOAD_MIN_INTERVAL_MS = 30_000;

/** `sessionStorage` key holding the time of the last build-change callback (epoch ms). */
export const BUILD_RELOAD_STORAGE_KEY = 'a2ui-pane:last-build-reload';

/**
 * How long a WebSocket may stay in `CONNECTING` before the client gives up on it.
 *
 * Some proxies (and the Vite dev server, which owns the upgrade path for HMR)
 * accept the TCP connection but never finish the handshake.
 */
export const DEFAULT_WS_CONNECT_TIMEOUT_MS = 3_000;

const DEFAULT_RECONNECT_DELAY_MS = 3_000;

/** The subset of `Storage` the reload guard needs; `sessionStorage` satisfies it. */
export interface BuildReloadStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Configuration options for `StreamClient`. */
export interface StreamClientOptions {
  conversationId: string;
  token?: string;
  /** URL of the SSE endpoint. Defaults to `./api/stream`. */
  baseUrl?: string;
  applier: LineApplier;
  reconnectDelayMs?: number;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: Event | Error) => void;
  eventSourceFactory?: (url: string) => EventSource;
  /**
   * URL of the WebSocket endpoint, resolved against the page URL with `http`
   * mapped to `ws` and `https` to `wss`. Defaults to `./api/ws`.
   */
  wsBaseUrl?: string;
  /** Handshake timeout for each WebSocket. Defaults to `DEFAULT_WS_CONNECT_TIMEOUT_MS`. */
  wsConnectTimeoutMs?: number;
  /**
   * Creates the WebSocket. When set, the client tries a WebSocket first. When
   * neither this nor `eventSourceFactory` is set, the client tries the global
   * `WebSocket` if one exists. Passing only `eventSourceFactory` keeps the client on SSE.
   */
  webSocketFactory?: (url: string) => WebSocket;
  /** Called when the active transport changes, including the fallback from WebSocket to SSE. */
  onTransportChange?: (transport: StreamTransport) => void;
  /** Called once when the sidecar starts serving a different pane build than this page loaded. */
  onBuildChanged?: () => void;
  /** URL of the config endpoint that reports `buildId`. Defaults to `./api/config`. */
  configUrl?: string;
  /** `fetch` used for the build check. Defaults to the global `fetch` when available. */
  fetchImpl?: typeof fetch;
  /** Storage for the reload guard. Defaults to `sessionStorage` when available. */
  storage?: BuildReloadStorage;
}

function defaultStorage(): BuildReloadStorage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
  } catch {
    // Sandboxed documents throw on access; fall back to an in-memory guard.
    return undefined;
  }
}

/**
 * Parses the data of a `snapshot` event: `{lines: StoreLine[]}` with one line per live surface.
 *
 * Skips and logs malformed lines, so one bad surface file cannot keep the pane
 * from removing surfaces that were deleted while it was disconnected.
 *
 * @throws {Error} When the payload is not JSON or has no `lines` array.
 */
export function parseSnapshotLines(data: string): StoreLine[] {
  const payload = JSON.parse(data) as {lines?: unknown};
  if (!payload || !Array.isArray(payload.lines)) {
    throw new Error('Snapshot event has no lines array');
  }
  return parseSnapshotLineArray(payload.lines);
}

/** The page URL to resolve relative endpoints against, or a placeholder outside a page. */
function pageHref(): string {
  const href = typeof window !== 'undefined' ? window.location?.href : undefined;
  return href && /^https?:/i.test(href) ? href : 'http://localhost/';
}

/**
 * Returns whether `href` (defaulting to `window.location.href`) uses a non-HTTP custom scheme
 * such as Electron's `plugin://` proxy where relative WebSocket URLs cannot resolve against the
 * page origin.
 */
export function isCustomOriginScheme(href?: string): boolean {
  const raw = href ?? (typeof window !== 'undefined' ? window.location?.href : undefined);
  if (!raw) return false;
  try {
    const protocol = new URL(raw).protocol;
    return !/^(https?|about):$/i.test(protocol);
  } catch {
    return false;
  }
}

function isAbsoluteNetworkUrl(url: string | undefined): boolean {
  return typeof url === 'string' && /^(wss?|https?):\/\//i.test(url);
}

/**
 * Builds the WebSocket stream URL: resolves `base` against `href`, maps
 * `http:` to `ws:` and `https:` to `wss:`, and adds the query parameters.
 * An absolute `ws://` or `wss://` base is used as is.
 */
export function resolveWsUrl(
  base: string,
  conversationId: string,
  token?: string,
  href: string = pageHref(),
): string {
  const url = new URL(base, href);
  if (url.protocol === 'http:') {
    url.protocol = 'ws:';
  } else if (url.protocol === 'https:') {
    url.protocol = 'wss:';
  }
  url.searchParams.set('conversationId', conversationId);
  if (token) {
    url.searchParams.set('token', token);
  }
  return url.toString();
}

/**
 * Manages the stream connection between the pane frontend and the sidecar backend.
 * Reconnects on drops, applies incoming lines, and triggers resets.
 *
 * The client prefers a WebSocket (`/api/ws`) and falls back to Server-Sent
 * Events (`/api/stream`). A WebSocket that fails before it ever opens (or
 * stays in `CONNECTING` past the handshake timeout) switches the client to SSE
 * at once for the life of the client. Once a WebSocket has opened, subsequent
 * drops keep retrying WebSocket so a prolonged sidecar restart cannot downgrade
 * active panes back onto the HTTP/1.1 connection pool.
 *
 * Each connection starts with a `snapshot` event that lists every live surface; the client
 * reconciles the processor with it, which removes surfaces deleted while it was disconnected.
 * Later `line` events carry per-surface changes, including `deleteSurface` tombstones.
 *
 * On every successful (re)connect it also fetches `/api/config` and compares `buildId` with
 * the first value it saw. A different value means the sidecar now serves a new bundle while
 * this page still runs the old one, so `onBuildChanged` fires (at most once per
 * `BUILD_RELOAD_MIN_INTERVAL_MS`, tracked in `sessionStorage` so it survives the reload).
 */
export class StreamClient {
  private eventSource: EventSource | null = null;
  private webSocket: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private transport: StreamTransport | null = null;
  private closedExplicitly = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wsHandshakeTimer: ReturnType<typeof setTimeout> | null = null;
  private wsDisabled = false;
  private everOpenedWs = false;
  private knownBuildId: string | null = null;
  private memoryLastReload = 0;

  constructor(private readonly options: StreamClientOptions) {}

  getStatus(): ConnectionStatus {
    return this.status;
  }

  /** The transport of the last opened connection, or null before any connection opened. */
  getTransport(): StreamTransport | null {
    return this.transport;
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.options.onStatusChange?.(newStatus);
    }
  }

  private setTransport(transport: StreamTransport): void {
    if (this.transport !== transport) {
      this.transport = transport;
      this.options.onTransportChange?.(transport);
    }
  }

  /** The status to show while a new connection opens. */
  private openingStatus(): ConnectionStatus {
    if (this.status === 'disconnected') return 'connecting';
    return this.status === 'connecting' ? 'connecting' : 'reconnecting';
  }

  connect(): void {
    this.closedExplicitly = false;
    this.openStream();
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearHandshakeTimer(): void {
    if (this.wsHandshakeTimer) {
      clearTimeout(this.wsHandshakeTimer);
      this.wsHandshakeTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closedExplicitly) {
        this.openStream();
      }
    }, this.options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS);
  }

  /** Reads the served `buildId`; undefined when the endpoint is unavailable or has none. */
  private async fetchBuildId(): Promise<string | undefined> {
    const fetchImpl = this.options.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
    if (!fetchImpl) return undefined;
    try {
      const resp = await fetchImpl(this.options.configUrl ?? './api/config');
      if (!resp.ok) return undefined;
      const config = (await resp.json()) as {buildId?: unknown};
      return typeof config.buildId === 'string' && config.buildId ? config.buildId : undefined;
    } catch {
      return undefined;
    }
  }

  private lastReloadAt(): number {
    const storage = this.options.storage ?? defaultStorage();
    const stored = Number(storage?.getItem(BUILD_RELOAD_STORAGE_KEY) ?? Number.NaN);
    return Number.isFinite(stored) ? stored : this.memoryLastReload;
  }

  private recordReload(now: number): void {
    this.memoryLastReload = now;
    const storage = this.options.storage ?? defaultStorage();
    try {
      storage?.setItem(BUILD_RELOAD_STORAGE_KEY, String(now));
    } catch {
      // Storage may be full or disabled; the in-memory value still guards this page.
    }
  }

  /** Compares the served build with the one this page loaded and fires `onBuildChanged`. */
  private async checkBuild(): Promise<void> {
    if (!this.options.onBuildChanged) return;
    const buildId = await this.fetchBuildId();
    if (buildId === undefined || this.closedExplicitly) return;
    if (this.knownBuildId === null) {
      this.knownBuildId = buildId;
      return;
    }
    if (buildId === this.knownBuildId) return;
    const now = Date.now();
    if (now - this.lastReloadAt() < BUILD_RELOAD_MIN_INTERVAL_MS) return;
    this.recordReload(now);
    this.knownBuildId = buildId;
    this.options.onBuildChanged();
  }

  private shouldUseWebSocket(): boolean {
    if (this.wsDisabled) return false;
    if (!isAbsoluteNetworkUrl(this.options.wsBaseUrl) && isCustomOriginScheme()) return false;
    if (this.options.webSocketFactory) return true;
    return !this.options.eventSourceFactory && typeof WebSocket === 'function';
  }

  private openStream(): void {
    if (this.shouldUseWebSocket()) {
      this.openWebSocket();
    } else {
      this.openSseStream();
    }
  }

  private closeEventSource(): void {
    const es = this.eventSource;
    if (!es) return;
    this.eventSource = null;
    es.onopen = null;
    es.onerror = null;
    es.close();
  }

  private closeWebSocket(): void {
    const ws = this.webSocket;
    if (!ws) return;
    this.webSocket = null;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    try {
      ws.close();
    } catch {
      // Closing a socket that never connected can throw in some environments.
    }
  }

  private openWebSocket(): void {
    if (this.closedExplicitly) return;
    this.clearReconnectTimer();
    this.clearHandshakeTimer();
    this.closeWebSocket();
    this.closeEventSource();
    this.setStatus(this.openingStatus());

    const url = resolveWsUrl(
      this.options.wsBaseUrl ?? `.${STREAM_WS_PATH}`,
      this.options.conversationId,
      this.options.token,
    );
    const createWs = this.options.webSocketFactory ?? ((wsUrl: string) => new WebSocket(wsUrl));
    let ws: WebSocket;
    try {
      ws = createWs(url);
    } catch (err) {
      this.handleWsFailure(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    this.webSocket = ws;

    // `error` is usually followed by `close`; settle each socket only once.
    let settled = false;
    const settle = (evt: Event | Error) => {
      if (settled) return;
      settled = true;
      this.clearHandshakeTimer();
      if (this.webSocket === ws) this.closeWebSocket();
      this.handleWsFailure(evt);
    };

    this.wsHandshakeTimer = setTimeout(() => {
      this.wsHandshakeTimer = null;
      settle(new Error('WebSocket handshake timed out'));
    }, this.options.wsConnectTimeoutMs ?? DEFAULT_WS_CONNECT_TIMEOUT_MS);

    ws.onopen = () => this.handleWsOpen();
    ws.onmessage = (event: MessageEvent) => this.handleWsMessage(event);
    ws.onerror = settle;
    ws.onclose = settle;
  }

  private handleWsOpen(): void {
    this.clearHandshakeTimer();
    this.everOpenedWs = true;
    this.setTransport('websocket');
    if (this.closedExplicitly) return;
    void this.checkBuild();
    this.setStatus('connected');
  }

  private handleWsMessage(event: MessageEvent): void {
    let evt: StreamEvent;
    try {
      evt = parseWsEvent(String(event.data));
    } catch (err) {
      console.error('[StreamClient] Failed to parse WebSocket event:', err);
      return;
    }
    this.applyStreamEvent(evt);
  }

  private applyStreamEvent(evt: StreamEvent): void {
    if (evt.type === STREAM_EVENT_LINE) {
      this.options.applier.apply([evt.line]);
    } else if (evt.type === STREAM_EVENT_SNAPSHOT) {
      this.options.applier.reconcile(evt.lines);
    } else {
      this.handleReset();
    }
  }

  /** Handles a WebSocket that errored, closed, or timed out. */
  private handleWsFailure(evt: Event | Error): void {
    if (this.closedExplicitly) return;
    if (!this.everOpenedWs) {
      this.fallBackToSse();
      return;
    }
    this.setStatus('reconnecting');
    this.options.onError?.(evt);
    this.scheduleReconnect();
  }

  /** Switches to SSE for the rest of the client's life and opens it at once. */
  private fallBackToSse(): void {
    this.wsDisabled = true;
    this.setTransport('sse');
    // The transport callback may have disconnected the client; openSseStream checks.
    this.openSseStream();
  }

  private openSseStream(): void {
    if (this.closedExplicitly) return;
    this.clearReconnectTimer();
    this.clearHandshakeTimer();
    this.closeWebSocket();
    this.closeEventSource();

    const base = this.options.baseUrl ?? `.${STREAM_SSE_PATH}`;
    const params = new URLSearchParams();
    params.set('conversationId', this.options.conversationId);
    if (this.options.token) {
      params.set('token', this.options.token);
    }

    const streamUrl = `${base}?${params.toString()}`;
    this.setStatus(this.openingStatus());

    const createEs = this.options.eventSourceFactory ?? ((url: string) => new EventSource(url));
    const es = createEs(streamUrl);
    this.eventSource = es;

    es.onopen = () => {
      this.setTransport('sse');
      if (this.closedExplicitly) return;
      void this.checkBuild();
      this.setStatus('connected');
    };

    es.onerror = evt => {
      if (this.closedExplicitly) return;
      this.setStatus('reconnecting');
      this.options.onError?.(evt);
      // EventSource.CLOSED === 2: browser halted automatic retries
      if ((es as any).readyState === 2) {
        this.scheduleReconnect();
      }
    };

    this.addDataListeners(es);
  }

  /** Routes `line`, `snapshot`, and legacy `reset` events to the applier. */
  private addDataListeners(es: EventSource): void {
    es.addEventListener(STREAM_EVENT_LINE, (event: MessageEvent) => {
      try {
        const line = parseStoreLine(event.data);
        this.options.applier.apply([line]);
      } catch (err) {
        console.error('[StreamClient] Failed to parse stream line:', err);
      }
    });

    es.addEventListener(STREAM_EVENT_SNAPSHOT, (event: MessageEvent) => {
      try {
        this.options.applier.reconcile(parseSnapshotLines(event.data));
      } catch (err) {
        console.error('[StreamClient] Failed to parse stream snapshot:', err);
      }
    });

    // Sent only by sidecars built before the per-surface store; kept for one release.
    es.addEventListener(STREAM_EVENT_RESET, () => this.handleReset());
  }

  private handleReset(): void {
    console.warn(
      '[StreamClient] Received reset event from server. Resetting applier and reconnecting.',
    );
    this.options.applier.reset();
    // Reopening creates a new connection, which restarts the stream from a fresh snapshot.
    this.openStream();
  }

  disconnect(): void {
    this.closedExplicitly = true;
    this.clearReconnectTimer();
    this.clearHandshakeTimer();
    this.closeWebSocket();
    this.closeEventSource();
    this.setStatus('disconnected');
  }
}
