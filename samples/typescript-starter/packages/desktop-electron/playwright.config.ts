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
  timeout: 60000, // 60 seconds
  retries: 1,
  testDir: 'e2e/',
  globalSetup: './e2e/global-setup.ts',
  reporter: process.env.CI
    ? [['list'], ['junit', {outputFile: 'e2e/test-results/junit.xml'}]]
    : undefined,
  outputDir: 'e2e/test-results/',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{platform}{ext}',
  use: {
    userAgent: 'playwright',
    screenshot: 'on',
    browserName: 'chromium',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  expect: {
    // See desktop-client playwright.config.ts for the threshold rationale.
    toHaveScreenshot: {maxDiffPixels: 5, threshold: 0.05},
    timeout: 60000, // 60 seconds
  },
});
