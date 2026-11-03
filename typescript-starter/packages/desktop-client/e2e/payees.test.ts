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

import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import type { PayeesPage } from './page-models/payees-page';

test.describe('Payees', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;
  let navigation: Navigation;
  let payeesPage: PayeesPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    // Navigate to the root URL and create a fresh test file
    await page.goto('/');
    await configurationPage.createTestFile();

    // Navigate to the Payees page before each test
    payeesPage = await navigation.goToPayeesPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the payees page visuals', async () => {
    // This is a simple visual check to ensure the page loads
    await expect(page).toMatchThemeScreenshots();

    // Try searching for "Fast Internet" or "Home Depot," etc.
    await payeesPage.searchFor('Fast Internet');
    // Screenshot check after searching
    await expect(page).toMatchThemeScreenshots();
  });

  test('shows Fast Internet in the payee list', async () => {
    await payeesPage.searchFor('Fast Internet');
    await expect(page.getByText('Fast Internet')).toBeVisible();
  });

  test('shows "Create rule" text for a payee', async () => {
    await payeesPage.searchFor('Deposit');
    await expect(page.getByText('Create rule')).toBeVisible();
  });

  test('filters out unrelated payees', async () => {
    await payeesPage.searchFor('asdfasdf-nonsense');

    // Get the text 'No payees' matching the search from the page
    const noPayeesMessage = page.locator('text=No payees').first();

    // Assert it is visible
    await expect(noPayeesMessage).toBeVisible();
  });

  test('right clicking a payee opens context menu', async () => {
    await payeesPage.searchFor('Fast Internet');
    await payeesPage.rightClickNthPayee(0);
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole('button', { name: 'Create rule' }),
    ).toBeVisible();
  });
});
