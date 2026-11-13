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

export {readSidecarEnv, type SidecarEnv} from './env.js';
export {checkToken} from './auth.js';
export {
  StoreReader,
  knownFromLines,
  STORE_TOMBSTONE_CALL_ID,
  type DiffResult,
  type KnownSurface,
  type KnownSurfaces,
} from './store-reader.js';
export {ChangeNotifier, conversationIdForPath, type ChangeCallback} from './change-notifier.js';
export {handleStream, type SseStreamOptions} from './sse-route.js';
export {
  handleSurfaceDelete,
  type SurfaceDeleteOptions,
  type SurfaceDeleteReason,
} from './surfaces-route.js';
export {handlePreload} from './preload-route.js';
export {handleSendMessage, type SendMessageOptions, type ExecFileFn} from './send-message-route.js';
export {serveStaticFile} from './static-files.js';
export {cleanupOldFiles, type CleanupResult} from './cleanup.js';
export {createSidecarServer, type SidecarDeps} from './server.js';
export {run, isMainModule} from './main.js';
