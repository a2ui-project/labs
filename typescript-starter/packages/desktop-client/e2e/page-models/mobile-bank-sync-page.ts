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

export class MobileBankSyncPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly accountsList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder(/Filter accounts/i);
    this.accountsList = page.getByRole('main');
  }

  async waitFor(options?: {
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }) {
    await this.accountsList.waitFor(options);
  }

  async waitToLoad() {
    await this.page.waitForSelector('text=Bank Sync', { timeout: 10000 });
  }

  async searchFor(term: string) {
    await this.searchBox.fill(term);
  }
}
