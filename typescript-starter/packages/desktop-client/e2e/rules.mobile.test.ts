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
import {MobileNavigation} from './page-models/mobile-navigation';
import type {MobileRulesPage} from './page-models/mobile-rules-page';

test.describe('Mobile Rules', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let rulesPage: MobileRulesPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({browser}) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    // Set mobile viewport
    await page.setViewportSize({
      width: 350,
      height: 600,
    });

    await page.goto('/');
    await configurationPage.createTestFile();

    // Navigate to rules page and wait for it to load
    rulesPage = await navigation.goToRulesPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('checks the page visuals', async () => {
    await rulesPage.searchFor('Dominion');

    // Check that the header is present
    await expect(page.getByRole('heading', {name: 'Rules'})).toBeVisible();

    // Check that the add button is present
    await expect(rulesPage.addButton).toBeVisible();

    // Check that the search box is present with proper placeholder
    await expect(rulesPage.searchBox).toBeVisible();
    await expect(rulesPage.searchBox).toHaveAttribute('placeholder', 'Filter rules…');

    await expect(page).toMatchThemeScreenshots();
  });

  test('clicking add button opens rule creation form', async () => {
    await rulesPage.clickAddRule();

    await expect(page).toMatchThemeScreenshots();
  });

  test('clicking on a rule opens edit form', async () => {
    await expect(async () => {
      const ruleCount = await rulesPage.getRuleCount();
      expect(ruleCount).toBeGreaterThan(0);
    }).toPass();

    await rulesPage.clickRule(0);

    // Click on the header to have consistent focused element
    // (otherwise sometimes the condition field is "hovered" and thus has a different background color)
    await page.getByRole('heading', {name: 'Edit Rule'}).click();

    await expect(page).toMatchThemeScreenshots();
  });

  test('page handles empty state gracefully', async () => {
    // Search for something that won't match to get empty state
    await rulesPage.searchFor('NonExistentRule123456789');

    // Check that empty message is shown
    const emptyMessage = page.getByText(/No rules found/);
    await expect(emptyMessage).toBeVisible();

    // Check that no rule items are visible
    const rules = rulesPage.getAllRules();
    await expect(rules).toHaveCount(0);
    await expect(page).toMatchThemeScreenshots();
  });
});
