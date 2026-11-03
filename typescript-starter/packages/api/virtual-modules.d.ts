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

// Ambient declarations for the browser build's Vite imports.

// Vite's inlined-worker import (`?worker&inline`): a Blob-URL Worker ctor.
declare module '*?worker&inline' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

// Runtime assets emitted by the `actual-embedded-assets` plugin
// (vite.browser.config.mts), sourced from loot-core's `default-filesystem`.
declare module 'virtual:actual-embedded-assets' {
  /** base64 of sql.js' sql-wasm.wasm */
  export const wasmBase64: string;
  /** contents of data-file-index.txt */
  export const dataIndex: string;
  /** base64 of each default filesystem file, keyed by its data/ wire name */
  export const dataFiles: Record<string, string>;
}
