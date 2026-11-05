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

import type {Locator, Page} from '@playwright/test';

import {MobileAccountPage} from './mobile-account-page';

export class MobileTransactionEntryPage {
  readonly page: Page;
  readonly header: Locator;
  readonly amountField: Locator;
  readonly transactionForm: Locator;
  readonly footer: Locator;
  readonly addTransactionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.getByRole('heading');
    this.transactionForm = page.getByTestId('transaction-form');
    this.amountField = this.transactionForm.getByTestId('amount-input');
    this.footer = page.getByTestId('transaction-form-footer');
    this.addTransactionButton = this.footer.getByRole('button', {
      name: 'Add transaction',
    });
  }

  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.transactionForm.waitFor(...options);
  }

  async fillAmount(value: string) {
    await this.amountField.fill(value);
    await this.amountField.evaluate(el => (el as HTMLInputElement).blur());
    // TransactionEdit.onUpdate runs an async rules-run before setTransactions,
    // so wait for the outer display button (reads props.value) to reflect the
    // committed amount before the next fillField snapshots the transaction.
    await this.transactionForm.getByRole('button').filter({hasText: value}).waitFor();
  }

  async fillField(fieldLocator: Locator, content: string) {
    await fieldLocator.click();
    const comboboxInput = this.page.getByRole('combobox').locator('input');
    // pressSequentially + option click: fill()+Enter breaks the autocomplete
    // highlight and selects "None"/wrong entry under CPU contention.
    await comboboxInput.pressSequentially(content);
    await this.page.getByRole('option').filter({hasText: content}).first().click();
    await comboboxInput.waitFor({state: 'hidden'});
    await fieldLocator.filter({hasText: content}).waitFor();
  }

  async createTransaction() {
    await this.addTransactionButton.click();

    return new MobileAccountPage(this.page);
  }
}
