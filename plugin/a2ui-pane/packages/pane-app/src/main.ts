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

import {injectHostTheme} from '@a2ui-pane/theme';
import {
  LineApplier,
  A2uiPaneView,
  type SurfaceDismissedDetail,
  type A2uiLinkClickDetail,
  openLink,
} from '@a2ui-pane/renderer';
import {StreamClient, ConnectionStatus, isCustomOriginScheme} from './stream-client.js';
import {ActionSender} from './action-sender.js';
import {showToast} from './toast.js';

// Inject host theme CSS variables
injectHostTheme();

/** Options for initializing the A2UI auxiliary pane application. */
export interface InitOptions {
  container?: HTMLElement | null;
  search?: string;
  fetchFn?: typeof fetch;
  eventSourceFactory?: (url: string) => EventSource;
  /** Creates the stream WebSocket. When set, the pane tries a WebSocket before SSE. */
  webSocketFactory?: (url: string) => WebSocket;
  /** Explicit WebSocket base URL, overriding `/api/config` discovery. */
  wsBaseUrl?: string;
  sendMessageFn?: (text: string) => Promise<any>;
  /** Maximum milliseconds to wait for an action send before timing out. */
  actionTimeoutMs?: number;
  onAction?: (action: any, dataModel?: Record<string, unknown>) => void;
  /** Replaces the page reload that runs when the sidecar serves a new pane build. */
  reloadFn?: () => void;
}

/** Handle returned by `initPaneApp` for inspecting and controlling the pane instance. */
export interface PaneAppInstance {
  applier: LineApplier;
  client?: StreamClient;
  actionSender: ActionSender;
  updateStatus: (status: ConnectionStatus) => void;
  updateErrors: () => void;
}

/** How long the "new build" toast shows before the page reloads itself. */
const BUILD_RELOAD_TOAST_MS = 1200;

/**
 * How long a stream resuming after a visibility pause may take to connect
 * before the badge shows "Connecting...". A faster resume keeps "Live".
 */
const RESUME_BADGE_GRACE_MS = 250;

const STATUS_STYLES: Readonly<Record<ConnectionStatus, {text: string; bg: string; color: string}>> =
  {
    connected: {text: 'Live', bg: '#dcffe4', color: '#155724'},
    connecting: {text: 'Connecting...', bg: '#f1f8ff', color: '#0366d6'},
    reconnecting: {text: 'Reconnecting...', bg: '#fff5b1', color: '#735c0f'},
    disconnected: {text: 'Offline', bg: '#f6f8fa', color: '#6a737d'},
  };

function applyStatusBadge(statusBadge: HTMLElement, status: ConnectionStatus): void {
  const spec = STATUS_STYLES[status];
  statusBadge.textContent = spec.text;
  statusBadge.style.background = spec.bg;
  statusBadge.style.color = spec.color;
}

function applyErrorBanner(
  errorBanner: HTMLElement,
  errorMessage: HTMLElement,
  errors: ReadonlyArray<{seq: number; error: string}>,
): void {
  if (errors.length > 0) {
    const latest = errors[errors.length - 1];
    errorMessage.textContent = `Warning: ${errors.length} A2UI update(s) failed (seq ${latest.seq}: ${latest.error})`;
    errorBanner.style.display = 'flex';
  } else {
    errorBanner.style.display = 'none';
  }
}

/** Why the pane removes a surface from the store. */
type SurfaceDeleteReason = 'dismissed' | 'submitted';

/**
 * Asks the sidecar to delete a surface's store file, so the surface stays
 * gone after a pane reload or a language server restart.
 *
 * Logs failures (including a `423` lock timeout) and never throws.
 *
 * @returns Whether the sidecar confirmed the request.
 */
async function deleteSurfaceOnDisk(
  conversationId: string,
  surfaceId: string,
  reason: SurfaceDeleteReason,
  token: string | undefined,
  fetchImpl?: typeof fetch,
): Promise<boolean> {
  if (!fetchImpl) return false;
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['X-Sidecar-Token'] = token;
    }
    const resp = await fetchImpl('./api/surfaces/delete', {
      method: 'POST',
      headers,
      body: JSON.stringify({conversationId, surfaceId, reason}),
    });
    if (!resp?.ok) {
      console.warn(`[main] Deleting surface ${surfaceId} failed: HTTP ${resp?.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[main] Deleting surface ${surfaceId} failed:`, err);
    return false;
  }
}

function closeAuxPane(): void {
  try {
    (window as any).sidecar?.ui?.toggleAuxPane?.({open: false});
  } catch {
    // Ignore host bridge errors
  }
}

async function reportPaneVisibility(
  conversationId: string,
  visible: boolean,
  token: string | undefined,
  fetchImpl?: typeof fetch,
): Promise<void> {
  if (!fetchImpl) return;
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['X-Sidecar-Token'] = token;
    }
    await fetchImpl('./api/visibility', {
      method: 'POST',
      headers,
      body: JSON.stringify({conversationId, visible}),
    });
  } catch {
    // Ignore visibility telemetry failures (e.g. relative URL in unit tests)
  }
}

/** Handle returned by `setupVisibilityTracking`. */
interface VisibilityTracker {
  /** Re-sends the current visibility to the sidecar. */
  reannounce: () => void;
  /** The visibility last reported to the sidecar. */
  isVisible: () => boolean;
}

function isDocumentHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

/** Width and height of `documentElement`, taking the larger of client and bounding sizes. */
function documentElementBox(docEl: HTMLElement): {
  width: number;
  height: number;
} {
  const rect =
    typeof docEl.getBoundingClientRect === 'function' ? docEl.getBoundingClientRect() : undefined;
  return {
    width: Math.max(docEl.clientWidth || 0, rect?.width || 0),
    height: Math.max(docEl.clientHeight || 0, rect?.height || 0),
  };
}

/** Calls `onChange` whenever `documentElement` resizes or changes intersection. */
function observeDocumentElement(onChange: () => void): void {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const docEl = document.documentElement;
  if (typeof ResizeObserver !== 'undefined') {
    try {
      new ResizeObserver(onChange).observe(docEl);
    } catch {
      // Ignore ResizeObserver errors in restricted environments
    }
  }
  if (typeof IntersectionObserver !== 'undefined') {
    try {
      new IntersectionObserver(onChange).observe(docEl);
    } catch {
      // Ignore IntersectionObserver errors in restricted environments
    }
  }
}

/** Wires the window and document events that can change pane visibility. */
function listenForVisibilityEvents(
  syncVisibility: (force?: boolean) => void,
  isCurrentlyVisible: () => boolean,
): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      syncVisibility();
    });
    window.addEventListener('message', (event: MessageEvent) => {
      const msgType = event.data && typeof event.data === 'object' ? event.data.type : undefined;
      if (msgType === 'theme-change' || msgType === 'workspace-change') {
        // IframeView mounts <IframeActiveSync> and posts theme-change/workspace-change
        // whenever the hoisted slot's `visible` prop flips from false to true.
        syncVisibility(isCurrentlyVisible());
      }
    });
    window.addEventListener('focus', () => {
      if (isCurrentlyVisible()) {
        syncVisibility(true);
      }
    });
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      syncVisibility();
    });
  }
  observeDocumentElement(() => {
    syncVisibility();
  });
}

/**
 * Returns a probe that reports whether the pane is visible now.
 *
 * The probe remembers whether `documentElement` ever had a positive size, so
 * it can tell a collapsed slot from an environment that never reports layout.
 */
function createVisibilityProbe(): () => boolean {
  let seenPositiveClientBox = false;
  return () => {
    if (typeof window === 'undefined') return true;
    if (isDocumentHidden()) return false;
    if (!(window.innerWidth > 0 && window.innerHeight > 0)) return false;
    if (typeof document === 'undefined' || !document.documentElement) return true;
    const docEl = document.documentElement;
    if (typeof docEl.getClientRects === 'function' && docEl.getClientRects().length === 0) {
      return false;
    }
    const box = documentElementBox(docEl);
    if (box.width > 0 && box.height > 0) {
      seenPositiveClientBox = true;
      return true;
    }
    // In Chromium, hiding an ancestor slot with `display: none` leaves
    // `window.innerWidth`/`innerHeight` at their last open dimensions
    // while collapsing `documentElement` client/bounding rects to 0x0.
    return !seenPositiveClientBox;
  };
}

/**
 * Returns a sender that POSTs visibility to the sidecar. When requests settle
 * out of order and the last one to settle disagrees with `latest()`, it sends
 * `latest()` again so the sidecar ends on the current value.
 */
function createVisibilityReporter(
  conversationId: string,
  token: string | undefined,
  fetchImpl: typeof fetch | undefined,
  latest: () => boolean,
): (visible: boolean) => void {
  let inFlightCount = 0;
  const sendVisibility = (visible: boolean) => {
    inFlightCount += 1;
    void reportPaneVisibility(conversationId, visible, token, fetchImpl).finally(() => {
      inFlightCount -= 1;
      if (inFlightCount === 0 && visible !== latest()) {
        sendVisibility(latest());
      }
    });
  };
  return sendVisibility;
}

/**
 * Tracks whether the pane is visible and reports changes to the sidecar.
 *
 * `onVisibilityChange` runs before the visibility POST, so a stream the
 * caller closes on hide frees its connection before the POST needs one.
 */
function setupVisibilityTracking(
  conversationId: string,
  token: string | undefined,
  fetchImpl?: typeof fetch,
  onVisibilityChange?: (visible: boolean) => void,
): VisibilityTracker {
  const isCurrentlyVisible = createVisibilityProbe();
  let lastVisible = isCurrentlyVisible();
  const sendVisibility = createVisibilityReporter(
    conversationId,
    token,
    fetchImpl,
    () => lastVisible,
  );

  const syncVisibility = (force = false) => {
    const nextVisible = isCurrentlyVisible();
    const changed = nextVisible !== lastVisible;
    if (!force && !changed) return;
    lastVisible = nextVisible;
    if (changed) onVisibilityChange?.(nextVisible);
    sendVisibility(nextVisible);
  };

  sendVisibility(lastVisible);
  listenForVisibilityEvents(syncVisibility, isCurrentlyVisible);

  return {
    reannounce: () => {
      syncVisibility(true);
    },
    isVisible: () => isCurrentlyVisible(),
  };
}

const PLACEHOLDER_CONVERSATION_IDS = new Set(['_new']);

function normalizeConversationId(id: string | null | undefined): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (!trimmed || PLACEHOLDER_CONVERSATION_IDS.has(trimmed)) return null;
  return trimmed;
}

function parseWsBaseUrl(raw: unknown): string | undefined {
  return typeof raw === 'string' && /^wss?:\/\//i.test(raw) ? raw : undefined;
}

async function resolvePaneConfig(
  initialId: string | null,
  needWsBaseUrl: boolean,
  fetchImpl?: typeof fetch,
): Promise<{conversationId: string | null; wsBaseUrl?: string}> {
  const fromQuery = initialId !== null ? normalizeConversationId(initialId) : null;
  if (initialId !== null && (!fromQuery || !needWsBaseUrl)) {
    return {conversationId: fromQuery};
  }
  if (!fetchImpl) {
    return {conversationId: fromQuery};
  }
  try {
    const resp = await fetchImpl('./api/config');
    if (resp.ok) {
      const config = (await resp.json()) as Record<string, unknown>;
      return {
        conversationId: fromQuery ?? normalizeConversationId(config?.conversationId as string),
        wsBaseUrl: parseWsBaseUrl(config?.wsBaseUrl),
      };
    }
  } catch {
    // Configuration fallback
  }
  return {conversationId: fromQuery};
}

function resolveSearch(options: InitOptions): string {
  if (options.search !== undefined) return options.search;
  return typeof window !== 'undefined' ? window.location.search : '';
}

function paneTemplate(conversationId: string | null): string {
  return `
    <header style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      border-bottom: 1px solid var(--a2ui-color-border, #e1e4e8);
      background-color: var(--a2ui-color-surface, var(--background, #fafbfc));
      font-size: 13px;
    ">
      <div style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
        <span>A2UI Pane</span>
        <span id="conv-badge" style="font-weight: normal; color: var(--a2ui-color-border, #6a737d); font-size: 11px;">
          ${conversationId ? `(${conversationId})` : ''}
        </span>
      </div>
      <div id="status-badge" style="
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 12px;
        background: #f1f8ff;
        color: #0366d6;
      ">
        Connecting...
      </div>
    </header>
    <div id="error-banner" style="
      display: none;
      background-color: #ffeef0;
      color: #b31d28;
      padding: 8px 16px;
      font-size: 12px;
      border-bottom: 1px solid #f97583;
      justify-content: space-between;
      align-items: center;
    ">
      <span id="error-message"></span>
      <button id="dismiss-error" style="
        background: transparent;
        border: none;
        color: #b31d28;
        cursor: pointer;
        font-weight: bold;
      ">✕</button>
    </div>
    <main style="flex: 1; overflow: hidden; position: relative;">
      <a2ui-pane-view id="pane-view"></a2ui-pane-view>
    </main>
  `;
}

function wireLinkClicks(paneView: A2uiPaneView): void {
  paneView.addEventListener('a2ui-link-click', (evt: Event) => {
    const detail = (evt as CustomEvent<A2uiLinkClickDetail>).detail;
    if (!detail?.href) return;
    void openLink(detail, {
      open: (url, target, features) => window.open(url, target, features),
      copy: text => navigator.clipboard.writeText(text),
      toast: message => showToast(message, false),
    }).then(result => {
      if (result === 'failed') {
        showToast(`Could not copy ${detail.href}`);
      }
    });
  });
}

type DeleteOnDisk = (surfaceId: string, reason: SurfaceDeleteReason) => Promise<boolean>;

/**
 * Retires a surface when the user presses its ✕: hides it at once, deletes its
 * store file, and then tells the agent with a `dismiss_surface` action.
 */
function wireSurfaceDismissal(
  paneView: A2uiPaneView,
  actionSender: ActionSender,
  deleteOnDisk: DeleteOnDisk,
): void {
  paneView.addEventListener('surface-dismissed', (evt: Event) => {
    const surfaceId = (evt as CustomEvent<SurfaceDismissedDetail>).detail?.surfaceId;
    if (!surfaceId) return;
    if (!paneView.isSurfaceDismissed(surfaceId)) {
      paneView.dismissSurface(surfaceId);
    }
    void deleteOnDisk(surfaceId, 'dismissed')
      .then(() =>
        actionSender.sendAction({
          name: 'dismiss_surface',
          surfaceId,
          sourceComponentId: 'surface-close-btn',
          timestamp: new Date().toISOString(),
          context: {label: 'Dismissed'},
        }),
      )
      .catch(err => {
        console.error('[main] dismiss sendAction failed:', err);
      });
  });
}

/**
 * Returns the default action handler: it sends the action to the agent and,
 * once a one-shot action is delivered, hides its surface and deletes the
 * surface's store file. A failed send keeps the surface; `ActionSender` has
 * already shown the error toast.
 */
function createActionHandler(
  paneView: A2uiPaneView,
  actionSender: ActionSender,
  deleteOnDisk: DeleteOnDisk,
): NonNullable<InitOptions['onAction']> {
  const onSent = (isOneShot: boolean, surfaceId: string | undefined) => {
    if (isOneShot) {
      if (surfaceId) {
        paneView.dismissSurface(surfaceId);
        void deleteOnDisk(surfaceId, 'submitted');
      }
      closeAuxPane();
    }
    showToast('Submitted to agent', false);
  };

  return (action: any, dataModel?: Record<string, unknown>) => {
    const surfaceId = typeof action?.surfaceId === 'string' ? action.surfaceId : undefined;
    if (surfaceId && paneView.isSurfaceDismissed(surfaceId)) return;
    const sourceId =
      typeof action?.sourceComponentId === 'string' ? action.sourceComponentId : undefined;
    const isOneShot = action?.oneShot !== false;
    const rollbackIfIdle = () => {
      if (isOneShot && surfaceId && !(sourceId && actionSender.isPending(sourceId))) {
        paneView.clearSubmittedState(surfaceId);
      }
    };
    actionSender
      .sendAction(action, dataModel)
      .then(sent => {
        if (sent) {
          onSent(isOneShot, surfaceId);
        } else {
          rollbackIfIdle();
        }
      })
      .catch(err => {
        rollbackIfIdle();
        console.error('[main] sendAction failed:', err);
      });
  };
}

interface StreamWiring {
  conversationId: string;
  token: string | undefined;
  wsBaseUrl?: string;
  fetchImpl: typeof fetch;
  applier: LineApplier;
  updateStatus: (status: ConnectionStatus) => void;
  updateErrors: () => void;
}

/** Controls status badge repaints around a stream paused because the pane was hidden. */
interface ResumeBadgeGate {
  /**
   * Called when the stream closes because the pane was hidden. Keeps the
   * current badge while hidden and briefly while resuming, if the stream was
   * connected or an earlier pause is still resuming.
   */
  pauseForHide: (wasConnected: boolean) => void;
  /** Ends a pause without repainting. */
  unpause: () => void;
  /** Forwards a stream status, holding it back while paused. */
  onStatus: (status: ConnectionStatus) => void;
}

/**
 * Returns a gate that keeps a hidden-and-shown pane from flashing its badge.
 *
 * While paused it drops `disconnected` so a hidden pane never paints
 * "Offline". On resume, `connecting` paints only if the stream has not
 * connected within `RESUME_BADGE_GRACE_MS`; `connected` and `reconnecting`
 * paint at once and end the pause.
 */
function createResumeBadgeGate(updateStatus: (status: ConnectionStatus) => void): ResumeBadgeGate {
  let paused = false;
  let latest: ConnectionStatus | undefined;
  let graceTimer: ReturnType<typeof setTimeout> | null = null;

  const clearGraceTimer = () => {
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
  };

  const unpause = () => {
    paused = false;
    clearGraceTimer();
  };

  const onPausedStatus = (status: ConnectionStatus) => {
    if (status === 'disconnected') return;
    if (status !== 'connecting') {
      unpause();
      updateStatus(status);
      return;
    }
    graceTimer ??= setTimeout(() => {
      graceTimer = null;
      paused = false;
      if (latest) updateStatus(latest);
    }, RESUME_BADGE_GRACE_MS);
  };

  return {
    pauseForHide: wasConnected => {
      if (!wasConnected && !paused) return;
      clearGraceTimer();
      paused = true;
    },
    unpause,
    onStatus: status => {
      latest = status;
      if (paused) {
        onPausedStatus(status);
      } else {
        updateStatus(status);
      }
    },
  };
}

/**
 * Opens or closes the stream when the pane is shown or hidden. An SSE stream
 * closes on hide to free its HTTP/1.1 connection slot; a WebSocket holds no
 * slot, so it stays open and the pane resumes without a reconnect.
 */
function applyVisibilityToStream(
  client: StreamClient,
  badge: ResumeBadgeGate,
  visible: boolean,
): void {
  if (visible) {
    if (client.getStatus() === 'disconnected') client.connect();
    return;
  }
  if (client.getTransport() === 'websocket') return;
  badge.pauseForHide(client.getStatus() === 'connected');
  client.disconnect();
}

/** Closes the stream when the page is unloaded or frozen and reopens it from the back/forward cache. */
function wirePageLifecycle(client: StreamClient, visibilityTracker: VisibilityTracker): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('pagehide', () => {
    client.disconnect();
  });
  window.addEventListener('pageshow', (evt: PageTransitionEvent) => {
    if (evt.persisted && visibilityTracker.isVisible() && client.getStatus() === 'disconnected') {
      client.connect();
    }
  });
}

function connectStream(options: InitOptions, wiring: StreamWiring): StreamClient {
  const {conversationId, token, wsBaseUrl, fetchImpl, applier, updateStatus, updateErrors} = wiring;
  const badge = createResumeBadgeGate(updateStatus);

  // The client callbacks below read `visibilityTracker`; they first run after `connect()`.
  const client = new StreamClient({
    conversationId,
    token,
    wsBaseUrl,
    applier,
    eventSourceFactory: options.eventSourceFactory,
    webSocketFactory: options.webSocketFactory,
    onStatusChange: status => {
      badge.onStatus(status);
      updateErrors();
      if (status === 'connected') {
        visibilityTracker.reannounce();
      }
    },
    onTransportChange: transport => {
      // Falling back to SSE while hidden would hold a connection slot for nothing.
      if (transport === 'sse' && !visibilityTracker.isVisible()) {
        badge.unpause();
        client.disconnect();
      }
    },
    onError: () => {
      updateErrors();
    },
    fetchImpl,
    onBuildChanged: () => {
      showToast('Pane updated to a new build', false, BUILD_RELOAD_TOAST_MS);
      const reload = options.reloadFn ?? (() => location.reload());
      setTimeout(reload, BUILD_RELOAD_TOAST_MS);
    },
  });

  const visibilityTracker = setupVisibilityTracking(conversationId, token, fetchImpl, visible =>
    applyVisibilityToStream(client, badge, visible),
  );

  wirePageLifecycle(client, visibilityTracker);

  // A pane mounted hidden holds no connection until it is first shown.
  if (visibilityTracker.isVisible()) {
    client.connect();
  }
  return client;
}

/**
 * Initializes the A2UI auxiliary pane DOM, SSE stream client, and action sender.
 */
export async function initPaneApp(options: InitOptions = {}): Promise<PaneAppInstance | undefined> {
  const appContainer =
    options.container !== undefined ? options.container : document.getElementById('app');
  if (!appContainer) return undefined;

  const urlParams = new URLSearchParams(resolveSearch(options));
  const token = urlParams.get('token') || undefined;
  const fetchImpl = options.fetchFn ?? fetch;
  const needWsBaseUrl = !options.wsBaseUrl && isCustomOriginScheme();
  const {conversationId, wsBaseUrl: configWsBaseUrl} = await resolvePaneConfig(
    urlParams.get('conversationId'),
    needWsBaseUrl,
    fetchImpl,
  );
  const wsBaseUrl = options.wsBaseUrl ?? configWsBaseUrl;

  appContainer.innerHTML = paneTemplate(conversationId);

  const statusBadge = appContainer.querySelector('#status-badge') as HTMLElement;
  const errorBanner = appContainer.querySelector('#error-banner') as HTMLElement;
  const errorMessage = appContainer.querySelector('#error-message') as HTMLElement;
  const dismissBtn = appContainer.querySelector('#dismiss-error') as HTMLButtonElement;
  const paneView = appContainer.querySelector('#pane-view') as A2uiPaneView;
  paneView.dismissibleSurfaces = true;

  const updateStatus = (status: ConnectionStatus) => applyStatusBadge(statusBadge, status);
  const updateErrors = () => applyErrorBanner(errorBanner, errorMessage, applier.getErrors());

  dismissBtn.addEventListener('click', () => {
    applier.clearErrors();
    updateErrors();
  });

  const actionSender = new ActionSender({
    conversationId,
    sendMessageFn: options.sendMessageFn,
    timeoutMs: options.actionTimeoutMs,
    onPendingChange: pending => {
      paneView.pendingComponents = pending;
    },
  });

  const deleteOnDisk: DeleteOnDisk = (surfaceId, reason) =>
    conversationId
      ? deleteSurfaceOnDisk(conversationId, surfaceId, reason, token, fetchImpl)
      : Promise.resolve(false);

  wireLinkClicks(paneView);
  wireSurfaceDismissal(paneView, actionSender, deleteOnDisk);

  const onAction = options.onAction ?? createActionHandler(paneView, actionSender, deleteOnDisk);
  const applier = new LineApplier(undefined, onAction);

  paneView.processor = applier.getProcessor();

  // Mirror per-surface failures into the view so a surface that cannot be
  // applied shows up as an error card instead of vanishing.
  const syncFailedSurfaces = () => {
    paneView.failedSurfaces = new Map(
      Array.from(applier.getFailedSurfaces(), ([id, failure]) => [id, failure.error]),
    );
  };
  applier.onApplied(() => {
    syncFailedSurfaces();
    updateErrors();
  });

  applier.onReset(newProcessor => {
    paneView.clearSubmittedSurfaces();
    paneView.processor = newProcessor;
    syncFailedSurfaces();
    updateErrors();
  });

  if (!conversationId) {
    statusBadge.textContent = 'No Conversation';
    statusBadge.style.background = '#ffeef0';
    statusBadge.style.color = '#b31d28';
    return {applier, actionSender, updateStatus, updateErrors};
  }

  const client = connectStream(options, {
    conversationId,
    token,
    wsBaseUrl,
    fetchImpl,
    applier,
    updateStatus,
    updateErrors,
  });

  return {applier, client, actionSender, updateStatus, updateErrors};
}

/**
 * Bootstraps `initPaneApp` when the browser DOM is ready unless auto-init is disabled.
 */
export function startApp(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if ((window as any).__A2UI_DISABLE_AUTO_INIT__) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initPaneApp().catch(err => console.error('[main] init failed:', err));
    });
  } else {
    const el = document.getElementById('app');
    if (el) {
      initPaneApp().catch(err => console.error('[main] init failed:', err));
    }
  }
}

startApp();
