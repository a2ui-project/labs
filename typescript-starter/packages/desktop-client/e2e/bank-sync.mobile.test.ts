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

import type {Page} from '@playwright/test';

import {expect, test} from './fixtures';
import {ConfigurationPage} from './page-models/configuration-page';
import type {MobileBankSyncPage} from './page-models/mobile-bank-sync-page';
import {MobileNavigation} from './page-models/mobile-navigation';

test.describe('Mobile Bank Sync', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let bankSyncPage: MobileBankSyncPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({browser}) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({
      width: 350,
      height: 600,
    });

    await page.goto('/');
    await configurationPage.createTestFile();

    bankSyncPage = await navigation.goToBankSyncPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the page visuals', async () => {
    await bankSyncPage.waitToLoad();

    await expect(page.getByRole('heading', {name: 'Bank Sync'})).toBeVisible();

    await expect(bankSyncPage.searchBox).toBeVisible();
    await expect(bankSyncPage.searchBox).toHaveAttribute('placeholder', 'Filter accounts…');

    await expect(page).toMatchThemeScreenshots();
  });

  test('searches for accounts', async () => {
    await bankSyncPage.searchFor('Checking');
    await expect(bankSyncPage.searchBox).toHaveValue('Checking');
    await expect(page).toMatchThemeScreenshots();
  });

  test('page handles empty state gracefully', async () => {
    await bankSyncPage.searchFor('NonExistentAccount123456789');

    const emptyMessage = page.getByText(/No accounts found/);
    await expect(emptyMessage).toBeVisible();

    await expect(page).toMatchThemeScreenshots();
  });
});
