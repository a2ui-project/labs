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

/** Validated runtime environment configuration for the sidecar HTTP server. */
export interface SidecarEnv {
  port: number;
  uiToken?: string;
  conversationId?: string;
  projectId?: string;
  agentapiExe?: string;
  lsAddress?: string;
  csrfToken?: string;
  dataDir: string;
}

/**
 * Reads and validates sidecar configuration from environment variables.
 * Fails fast with descriptive errors if mandatory parameters are missing or invalid.
 */
export function readSidecarEnv(env: Record<string, string | undefined> = process.env): SidecarEnv {
  const rawPort = env.ANTIGRAVITY_SIDECAR_WEB_PORT;
  if (!rawPort) {
    throw new Error('Missing required environment variable ANTIGRAVITY_SIDECAR_WEB_PORT');
  }

  const port = parseInt(rawPort, 10);
  if (isNaN(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port number in ANTIGRAVITY_SIDECAR_WEB_PORT: "${rawPort}"`);
  }

  const dataDir = env.A2UI_PANE_DATA;
  if (!dataDir) {
    throw new Error('Missing required environment variable A2UI_PANE_DATA');
  }

  return {
    port,
    uiToken: env.ANTIGRAVITY_SIDECAR_UI_TOKEN || undefined,
    conversationId: env.ANTIGRAVITY_CONVERSATION_ID || undefined,
    projectId: env.ANTIGRAVITY_PROJECT_ID || undefined,
    agentapiExe: env.ANTIGRAVITY_AGENTAPI_EXE || undefined,
    lsAddress: env.ANTIGRAVITY_LS_ADDRESS || undefined,
    csrfToken: env.ANTIGRAVITY_CSRF_TOKEN || undefined,
    dataDir,
  };
}
