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

test.describe('Tour', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  async function startTourFromHelpMenu() {
    await page.getByRole('button', { name: 'Help' }).click();
    await page.getByText('Take a tour').click();
    return page.getByTestId('tour-tooltip');
  }

  test('walks through every step of the tour', async () => {
    const tooltip = await startTourFromHelpMenu();

    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Welcome to Actual!');

    const counter = tooltip.getByText(/^\d+ of \d+$/);
    await expect(counter).toBeVisible();
    const total = Number((await counter.textContent())?.match(/of (\d+)/)?.[1]);
    expect(total).toBeGreaterThan(1);

    for (let step = 2; step <= total; step++) {
      await tooltip.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(counter).toHaveText(`${step} of ${total}`);
    }

    await expect(tooltip).toContainText('Getting Help');
    await tooltip.getByRole('button', { name: 'Finish' }).click();
    await expect(tooltip).not.toBeVisible();
  });

  test('skipping the tour dismisses it', async () => {
    const tooltip = await startTourFromHelpMenu();

    await expect(tooltip).toBeVisible();
    await tooltip.getByRole('button', { name: 'Skip tour' }).click();
    await expect(tooltip).not.toBeVisible();
  });
});
