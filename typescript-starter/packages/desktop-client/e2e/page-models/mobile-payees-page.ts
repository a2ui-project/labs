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

export class MobilePayeesPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly payeesList: Locator;
  readonly emptyMessage: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder('Filter payees…');
    this.payeesList = page.getByRole('grid', { name: 'Payees' });
    this.emptyMessage = page.getByText('No payees found.');
    this.loadingIndicator = page.getByTestId('animated-loading');
  }

  async waitFor(options?: {
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }) {
    await this.payeesList.waitFor(options);
  }

  /**
   * Search for payees using the search box
   */
  async searchFor(text: string) {
    await this.searchBox.fill(text);
  }

  /**
   * Clear the search box
   */
  async clearSearch() {
    await this.searchBox.fill('');
  }

  /**
   * Get the nth payee item (0-based index)
   */
  getNthPayee(index: number) {
    return this.getAllPayees().nth(index);
  }

  /**
   * Get all visible payee items
   */
  getAllPayees() {
    return this.payeesList.getByRole('gridcell');
  }

  /**
   * Click on a payee to open the edit page
   */
  async clickPayee(index: number) {
    const payee = this.getNthPayee(index);
    await payee.click();
  }

  /**
   * Get the number of visible payees
   */
  async getPayeeCount() {
    const payees = this.getAllPayees();
    return await payees.count();
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingToComplete(timeout: number = 10000) {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout });
  }
}
