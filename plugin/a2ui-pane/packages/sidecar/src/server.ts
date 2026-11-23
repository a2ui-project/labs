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

import fs from 'node:fs';
import http, {IncomingMessage, ServerResponse} from 'node:http';
import path from 'node:path';
import type {Duplex} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {WebSocketServer} from 'ws';
import {isValidId, STREAM_SSE_PATH, STREAM_WS_PATH} from '@a2ui-pane/protocol';
import {SurfaceStore} from '@a2ui-pane/protocol/store-fs';
import {SidecarEnv} from './env.js';
import {checkToken} from './auth.js';
import {StoreReader} from './store-reader.js';
import {ChangeNotifier} from './change-notifier.js';
import {handleStream} from './sse-route.js';
import {handleWsStream} from './ws-route.js';
import {handlePreload} from './preload-route.js';
import {handleSendMessage, ExecFileFn} from './send-message-route.js';
import {handleSurfaceDelete} from './surfaces-route.js';
import {currentBuildId, serveStaticFile} from './static-files.js';

/** Injectable dependencies for `createSidecarServer`. */
export interface SidecarDeps {
  storeReader: StoreReader;
  notifier: ChangeNotifier;
  /** Store the delete route writes to; defaults to a `SurfaceStore` over `env.dataDir`. */
  surfaceStore: SurfaceStore;
  staticDir: string;
  execFileFn?: ExecFileFn;
  keepaliveIntervalMs?: number;
  onVisibilityChange?: (conversationId: string, visible: boolean) => void;
}

function isAttachedConversationId(id: unknown): id is string {
  return typeof id === 'string' && id !== '_new' && isValidId(id);
}

function handleVisibility(
  req: IncomingMessage,
  res: ServerResponse,
  onVisibilityChange?: (conversationId: string, visible: boolean) => void,
): void {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body || '{}') as {
        conversationId?: unknown;
        visible?: unknown;
      };
      if (!isAttachedConversationId(parsed.conversationId) || typeof parsed.visible !== 'boolean') {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({error: 'Invalid conversationId or visible flag'}));
        return;
      }
      onVisibilityChange?.(parsed.conversationId, parsed.visible);
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ok: true}));
    } catch {
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: 'Malformed JSON body'}));
    }
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(body));
}

/** Standard CORS headers for local and reverse-proxied sidecar communication. */
function setCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const reqOrigin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', reqOrigin || '*');
  if (reqOrigin) {
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-sidecar-token, x-token, Last-Event-ID',
  );
}

/** Returns the first candidate pane-app build directory that exists. */
function defaultStaticDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidateDirs = [
    path.resolve(here, 'pane'),
    path.resolve(here, '../../pane-app/dist'),
    path.resolve(here, '../../../packages/pane-app/dist'),
  ];
  return candidateDirs.find(cand => fs.existsSync(cand)) ?? candidateDirs[0];
}

/** Resolved dependencies and per-server state shared by the route handlers. */
interface RouteContext {
  env: SidecarEnv;
  storeReader: StoreReader;
  notifier: ChangeNotifier;
  surfaceStore: SurfaceStore;
  staticDir: string;
  injectedDeps?: Partial<SidecarDeps>;
  activeStreams: Map<string, number>;
}

/** A token-protected API route. */
interface ProtectedRoute {
  method: string;
  path: string;
  handle: (req: IncomingMessage, res: ServerResponse, url: URL, ctx: RouteContext) => void;
}

/**
 * Registers an open SSE or WebSocket stream for a conversation and returns an
 * idempotent release callback that reports a hidden pane when the last stream closes.
 */
function registerActiveStream(convId: string, ctx: RouteContext): () => void {
  const {activeStreams} = ctx;
  activeStreams.set(convId, (activeStreams.get(convId) ?? 0) + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const remaining = (activeStreams.get(convId) ?? 1) - 1;
    if (remaining <= 0) {
      activeStreams.delete(convId);
      ctx.injectedDeps?.onVisibilityChange?.(convId, false);
    } else {
      activeStreams.set(convId, remaining);
    }
  };
}

function resolveConversationId(url: URL, ctx: RouteContext): string | null | undefined {
  return url.searchParams.has('conversationId')
    ? url.searchParams.get('conversationId')
    : ctx.env.conversationId;
}

function handleStreamRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: RouteContext,
): void {
  const rawConvId = resolveConversationId(url, ctx);
  if (!isAttachedConversationId(rawConvId)) {
    sendJson(res, 400, {
      error: `Invalid or missing conversationId: ${String(rawConvId)}`,
    });
    return;
  }
  const release = registerActiveStream(rawConvId, ctx);
  req.on('close', release);
  handleStream(req, res, rawConvId, ctx.storeReader, ctx.notifier, {
    keepaliveIntervalMs: ctx.injectedDeps?.keepaliveIntervalMs,
  });
}

function rejectUpgrade(socket: Duplex, status: number, reason: string): void {
  socket.once('finish', () => socket.destroy());
  socket.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
}

function handleUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  wss: WebSocketServer,
  ctx: RouteContext,
): void {
  socket.on('error', () => {});
  const host = req.headers.host || 'localhost';
  let url: URL;
  try {
    url = new URL(req.url ?? '/', `http://${host}`);
  } catch {
    rejectUpgrade(socket, 400, 'Bad Request');
    return;
  }
  if (url.pathname !== STREAM_WS_PATH) {
    rejectUpgrade(socket, 404, 'Not Found');
    return;
  }
  if (!checkToken(req, url, ctx.env.uiToken)) {
    rejectUpgrade(socket, 401, 'Unauthorized');
    return;
  }
  const rawConvId = resolveConversationId(url, ctx);
  if (!isAttachedConversationId(rawConvId)) {
    rejectUpgrade(socket, 400, 'Bad Request');
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => {
    const release = registerActiveStream(rawConvId, ctx);
    ws.on('close', release);
    ws.on('error', release);
    handleWsStream(ws, rawConvId, ctx.storeReader, ctx.notifier, {
      keepaliveIntervalMs: ctx.injectedDeps?.keepaliveIntervalMs,
    });
  });
}

const PROTECTED_ROUTES: ProtectedRoute[] = [
  // SSE Stream endpoint
  {method: 'GET', path: STREAM_SSE_PATH, handle: handleStreamRoute},
  // Pane visibility reporting endpoint
  {
    method: 'POST',
    path: '/api/visibility',
    handle: (req, res, _url, ctx) =>
      handleVisibility(req, res, ctx.injectedDeps?.onVisibilityChange),
  },
  // Surface removal on dismiss or submit
  {
    method: 'POST',
    path: '/api/surfaces/delete',
    handle: (req, res, _url, ctx) =>
      handleSurfaceDelete(req, res, {
        dataDir: ctx.env.dataDir,
        store: ctx.surfaceStore,
      }),
  },
  // Action dispatch endpoint
  {
    method: 'POST',
    path: '/_sidecar/send-message',
    handle: (req, res, _url, ctx) =>
      handleSendMessage(req, res, {
        agentapiExe: ctx.env.agentapiExe,
        execFileFn: ctx.injectedDeps?.execFileFn,
        dataDir: ctx.env.dataDir,
      }),
  },
];

/** Serves the routes that need no token. Returns whether the request was handled. */
function handlePublicRoute(res: ServerResponse, url: URL, ctx: RouteContext): boolean {
  switch (url.pathname) {
    case '/api/health':
      sendJson(res, 200, {status: 'ok', uptime: process.uptime()});
      return true;
    case '/api/config':
      sendJson(res, 200, {
        conversationId: ctx.env.conversationId,
        projectId: ctx.env.projectId,
        buildId: currentBuildId(ctx.staticDir),
      });
      return true;
    case '/preload.js':
      handlePreload(res);
      return true;
    default:
      return false;
  }
}

function handleRequest(req: IncomingMessage, res: ServerResponse, ctx: RouteContext): void {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url ?? '/', `http://${host}`);
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (handlePublicRoute(res, url, ctx)) return;

  const route = PROTECTED_ROUTES.find(r => r.path === url.pathname && r.method === req.method);
  if (route) {
    if (!checkToken(req, url, ctx.env.uiToken)) {
      sendJson(res, 401, {error: 'Unauthorized: Invalid token'});
      return;
    }
    route.handle(req, res, url, ctx);
    return;
  }

  // Static assets fallback (SPA index.html / bundled assets)
  if (req.method === 'GET' && serveStaticFile(ctx.staticDir, url.pathname, res)) return;

  // 404 for all other unhandled routes
  sendJson(res, 404, {error: `Not Found: ${url.pathname}`});
}

/**
 * Creates and configures the Sidecar HTTP server with all API routes and static asset serving.
 * Designed with dependency injection to allow running on port 0 with mock stores during testing.
 */
export function createSidecarServer(
  env: SidecarEnv,
  injectedDeps?: Partial<SidecarDeps>,
): http.Server {
  const ctx: RouteContext = {
    env,
    storeReader: injectedDeps?.storeReader ?? new StoreReader(env.dataDir),
    notifier: injectedDeps?.notifier ?? new ChangeNotifier(env.dataDir),
    surfaceStore: injectedDeps?.surfaceStore ?? new SurfaceStore(env.dataDir),
    staticDir: injectedDeps?.staticDir ?? defaultStaticDir(),
    injectedDeps,
    activeStreams: new Map<string, number>(),
  };
  const wss = new WebSocketServer({noServer: true});
  const server = http.createServer((req: IncomingMessage, res: ServerResponse) =>
    handleRequest(req, res, ctx),
  );
  server.on('upgrade', (req, socket, head) => handleUpgrade(req, socket, head, wss, ctx));

  const originalClose = server.close.bind(server);
  server.close = (cb?: (err?: Error) => void) => {
    for (const client of wss.clients) {
      client.terminate();
    }
    wss.close();
    return originalClose(cb);
  };
  return server;
}
