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

import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {build} from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));

// Build the consumer fixture (e2e/consumer) for production with Vite, exactly
// as a third-party app would. serve-dist.mjs then serves the output (with the
// COOP/COEP headers) at /e2e/consumer/dist/. This is the coverage the
// verbatim-dist harness can't give: a consumer bundler processing browser.js.
// Playwright's globalSetup contract requires a default export.
// oxlint-disable-next-line import/no-default-export
export default async function globalSetup() {
  await build({
    root: path.join(here, 'consumer'),
    base: './',
    logLevel: 'warn',
    // The workspace package keeps a dev-only `development` export condition; a
    // published consumer has none. Drop it so `browser` (dist/browser.js) wins.
    resolve: {conditions: ['browser', 'module', 'default']},
    build: {outDir: path.join(here, 'consumer', 'dist'), emptyOutDir: true},
  });
}
