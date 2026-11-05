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

import {defineConfig} from '@playwright/test';

export default defineConfig({
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  testDir: 'e2e/',
  // Builds the consumer fixture (e2e/consumer) once before the tests run.
  globalSetup: './e2e/global-setup.mjs',
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    baseURL: 'http://localhost:4180',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node e2e/serve-dist.mjs',
    url: 'http://localhost:4180/e2e/harness.html',
    reuseExistingServer: !process.env.CI,
  },
});
