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

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { _electron, test as base } from '@playwright/test';
import type { ElectronApplication, Page, TestInfo } from '@playwright/test';

type ElectronFixtures = {
  electronApp: ElectronApplication;
  electronPage: Page;
};

type ElectronOptions = {
  /**
   * When true, the app is launched with its budget data folder pointing
   * inside a regular file, so creating the folder fails at startup. Used to
   * exercise the startup error screen.
   */
  blockDocumentDir: boolean;
};

// Create the extended test with fixtures
export const test = base.extend<ElectronFixtures & ElectronOptions>({
  blockDocumentDir: [false, { option: true }],

  electronApp: async ({ blockDocumentDir }, use, testInfo: TestInfo) => {
    const uniqueTestId = testInfo.testId.replace(/[^\w-]/g, '-');
    const testDataDir = path.join('e2e/data/', uniqueTestId);

    await rm(testDataDir, { recursive: true, force: true }); // ensure any leftover test data is removed
    await mkdir(testDataDir, { recursive: true });

    let documentDir = testDataDir;
    if (blockDocumentDir) {
      // A regular file can't contain a folder, so `mkdir <file>/Actual` fails
      // deterministically on every platform.
      documentDir = path.join(testDataDir, 'blocked');
      await writeFile(documentDir, 'not a directory');
    }

    const app = await _electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        ACTUAL_DOCUMENT_DIR: documentDir,
        ACTUAL_DATA_DIR: testDataDir,
        EXECUTION_CONTEXT: 'playwright',
        NODE_ENV: 'development',
      },
    });

    await use(app);

    // Cleanup after tests
    await app.close();
    await rm(testDataDir, { recursive: true, force: true });
  },

  electronPage: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await use(page);
  },
});
