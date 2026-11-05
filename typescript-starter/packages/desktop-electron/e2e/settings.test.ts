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

// oxlint-disable no-restricted-imports --fix me
import fs from 'node:fs/promises';
import path from 'node:path';

import {ConfigurationPage} from '@actual-app/web/e2e/page-models/configuration-page';
import {Navigation} from '@actual-app/web/e2e/page-models/navigation';
import type {SettingsPage} from '@actual-app/web/e2e/page-models/settings-page';
import {expect} from '@playwright/test';

import {test} from './fixtures';

test.describe('Settings', () => {
  let navigation: Navigation;
  let settingsPage: SettingsPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({electronPage}) => {
    navigation = new Navigation(electronPage);
    configurationPage = new ConfigurationPage(electronPage);

    await configurationPage.clickOnNoServer();
    await configurationPage.createDemoFile();

    settingsPage = await navigation.goToSettingsPage();
  });

  test('downloads the export of the budget', async ({electronApp}) => {
    const exportPath = path.resolve('e2e/data/export-test.zip');

    // Mock the native save dialog to auto-return a known path
    await electronApp.evaluate(async ({dialog}, filePath) => {
      dialog.showSaveDialog = () => Promise.resolve({canceled: false, filePath});
    }, exportPath);

    await settingsPage.exportData();

    // Wait for the file to appear on disk and check it's not empty
    await expect(async () => {
      const stats = await fs.stat(exportPath);
      expect(stats.size).toBeGreaterThan(0);
    }).toPass({timeout: 10_000});
  });
});
