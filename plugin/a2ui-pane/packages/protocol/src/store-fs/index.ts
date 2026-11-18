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

/**
 * Node-only file system store for A2UI pane surfaces. Import it as
 * `@a2ui-pane/protocol/store-fs`; the main entry point stays browser-safe.
 * See `docs/store-format.md` for the on-disk contract.
 */
export {SurfaceStore} from './surface-store.js';
export {
  DEFAULT_LOCK_TIMEOUT_MS,
  DEFAULT_STALE_LOCK_MS,
  StoreLockError,
  withConversationLock,
  withConversationLockAsync,
} from './lock.js';
export type {LockOptions} from './lock.js';
export {foldLegacyLog, migrateLegacyStore} from './migrate.js';
export {
  conversationDir,
  conversationsDir,
  isStorableSurfaceId,
  legacyFile,
  lockFile,
  migratedFile,
  seqFile,
  surfaceFile,
  surfaceIdFromFileName,
  LOCK_FILE_NAME,
  SEQ_FILE_NAME,
  SURFACE_FILE_PATTERN,
} from './layout.js';
