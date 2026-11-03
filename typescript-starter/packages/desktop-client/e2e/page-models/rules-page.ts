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

import type { Locator, Page } from '@playwright/test';

import { EditRuleModal } from './edit-rule-modal';

export class RulesPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly createNewRuleButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder('Filter rules...');
    this.createNewRuleButton = page.getByRole('button', {
      name: 'Create new rule',
    });
  }

  /**
   * Open the edit rule modal to create a new rule.
   */
  async createNewRule() {
    await this.createNewRuleButton.click();
    return new EditRuleModal(this.page.getByTestId('edit-rule-modal'));
  }

  /**
   * Retrieve the data for the nth-rule.
   * 0-based index
   */
  getNthRule(index: number) {
    const row = this.page.getByTestId('table').getByTestId('row').nth(index);

    return {
      conditions: row.getByTestId('conditions').locator(':scope > div'),
      actions: row.getByTestId('actions').locator(':scope > div'),
    };
  }

  async searchFor(text: string) {
    await this.searchBox.fill(text);
  }

  async rightClickNthRule(index: number) {
    await this.page
      .getByTestId('table')
      .getByTestId('row')
      .nth(index)
      .click({ button: 'right' });
  }
}
