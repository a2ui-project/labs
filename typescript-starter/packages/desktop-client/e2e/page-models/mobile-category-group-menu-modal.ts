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

export class CategoryGroupMenuModal {
  readonly page: Page;
  readonly locator: Locator;
  readonly heading: Locator;
  readonly menuButton: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
    this.page = locator.page();

    this.heading = locator.getByRole('heading');
    this.menuButton = this.heading.getByRole('button', {name: 'Menu'});
  }

  async delete() {
    await this.menuButton.click();
    await this.page.locator('[data-popover]').getByRole('button', {name: 'Delete'}).click();
  }
}
