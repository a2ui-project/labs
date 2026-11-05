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

export class CustomReportPage {
  readonly page: Page;
  readonly pageContent: Locator;
  readonly showLegendButton: Locator;
  readonly showSummaryButton: Locator;
  readonly showLabelsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageContent = page.getByTestId('reports-page');

    this.showLegendButton = this.pageContent.getByRole('button', {
      name: 'Show Legend',
    });
    this.showSummaryButton = this.pageContent.getByRole('button', {
      name: 'Show Summary',
    });
    this.showLabelsButton = this.pageContent.getByRole('button', {
      name: 'Show Labels',
    });
  }

  async selectViz(vizName: string | RegExp) {
    await this.pageContent.getByRole('button', {name: vizName}).click();
  }

  async selectMode(mode: 'total' | 'time') {
    switch (mode) {
      case 'total':
        await this.pageContent.getByRole('button', {name: 'Total', exact: true}).click();
        break;
      case 'time':
        await this.pageContent.getByRole('button', {name: 'Time', exact: true}).click();
        break;
      default:
        throw new Error(`Unrecognized mode: ${String(mode)}`);
    }
  }
}
