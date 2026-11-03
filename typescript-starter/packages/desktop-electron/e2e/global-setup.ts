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

import { execFileSync } from 'node:child_process';

// Electron >= 42 downloads its binary on the first launch instead of at
// install time. Fetch it before the test workers start, otherwise parallel
// workers race the download/extraction and `electron.launch` fails with
// `spawn ETXTBSY`. The install script exits immediately when the binary is
// already present.
function globalSetup() {
  execFileSync(process.execPath, [require.resolve('electron/install.js')], {
    stdio: 'inherit',
  });
}

// Playwright requires the setup function to be the default export.
// oxlint-disable-next-line import/no-default-export
export default globalSetup;
