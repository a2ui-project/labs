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

type ScheduleEntry = {
  scheduleName?: string;
  payee?: string;
  account?: string;
  amount?: number;
};

export class ScheduleEditModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly scheduleNameInput: Locator;
  readonly payeeInput: Locator;
  readonly accountInput: Locator;
  readonly amountInput: Locator;
  readonly addButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.scheduleNameInput = locator.getByRole('textbox', {
      name: 'Schedule name',
    });
    this.payeeInput = locator.getByRole('textbox', { name: 'Payee' });
    this.accountInput = locator.getByRole('textbox', { name: 'Account' });
    this.amountInput = locator.getByLabel('Amount');
    this.addButton = locator.getByRole('button', { name: 'Add' });
    this.saveButton = locator.getByRole('button', { name: 'Save' });
    this.cancelButton = locator.getByRole('button', { name: 'Cancel' });
  }

  async fill(data: ScheduleEntry) {
    // Using pressSequentially on autocomplete fields here to simulate user typing.
    // When using .fill(...), playwright just "pastes" the entire word onto the input
    // and for some reason this breaks the autocomplete highlighting logic
    // e.g. "Create payee" option is not being highlighted.

    if (data.scheduleName) {
      await this.scheduleNameInput.fill(data.scheduleName);
    }

    if (data.payee) {
      await this.#typeAndSelectOption(this.payeeInput, data.payee);
    }

    if (data.account) {
      await this.#typeAndSelectOption(this.accountInput, data.account);
    }

    if (data.amount) {
      await this.amountInput.fill(String(data.amount));
    }
  }

  async #typeAndSelectOption(input: Locator, content: string) {
    await input.pressSequentially(content);
    // Click the option: Enter on a not-yet-highlighted list saves "None".
    await this.page
      .getByRole('option')
      .filter({ hasText: content })
      .first()
      .click();
  }

  async save() {
    await this.saveButton.click();
  }

  async add() {
    await this.addButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async close() {
    await this.heading.getByRole('button', { name: 'Close' }).click();
  }
}
