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

// Type declarations for ./default-filesystem.mjs (a Node-only build helper).

/** Absolute path to loot-core's bundled migrations directory. */
export const migrationsDir: string;
/** Absolute path to loot-core's default budget database. */
export const defaultDbPath: string;
/** Absolute path to the sql.js wasm binary loot-core depends on. */
export const sqlWasmPath: string;

/** The `data-file-index.txt` manifest listing every file under `data/`. */
export function buildDataFileIndex(names?: string[]): string;

/** The base64-encoded assets a self-contained browser worker embeds. */
export function collectEmbeddedAssets(): {
  wasmBase64: string;
  dataFiles: Record<string, string>;
  index: string;
};
