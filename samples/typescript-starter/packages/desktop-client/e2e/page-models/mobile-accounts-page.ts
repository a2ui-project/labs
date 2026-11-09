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

export class MobileAccountsPage {
  readonly page: Page;
  readonly accountList: Locator;
  readonly accountListItems: Locator;

  constructor(page: Page) {
    this.page = page;

    this.accountList = this.page.getByLabel('Account list');
    this.accountListItems = this.accountList.getByTestId('account-list-item');
  }

  async waitFor(...options: Parameters<Locator['waitFor']>) {
    await this.accountList.waitFor(...options);
  }

  /**
   * Get the name and balance of the nth account
   */
  async getNthAccount(idx: number) {
    const accountRow = this.accountListItems.nth(idx);

    return {
      name: accountRow.getByTestId('account-name'),
      balance: accountRow.getByTestId('account-balance'),
    };
  }

  /**
   * Click on the n-th account to open it up
   */
  async openNthAccount(idx: number) {
    await this.accountListItems.nth(idx).click();

    return new MobileAccountPage(this.page);
  }
}
