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

import {ScheduleEditModal} from './schedule-edit-modal';

export class SchedulesPage {
  readonly page: Page;
  readonly addNewScheduleButton: Locator;
  readonly schedulesTableRow: Locator;

  constructor(page: Page) {
    this.page = page;

    this.addNewScheduleButton = this.page.getByRole('button', {
      name: 'Add new schedule',
    });
    this.schedulesTableRow = this.page.getByTestId('table').getByTestId('row');
  }

  /**
   * Open the schedule edit modal.
   */
  async addNewSchedule() {
    await this.addNewScheduleButton.click();

    return new ScheduleEditModal(this.page.getByTestId('schedule-edit-modal'));
  }

  /**
   * Retrieve the row element for the nth-schedule.
   * 0-based index
   */
  getNthScheduleRow(index: number) {
    return this.schedulesTableRow.nth(index);
  }

  /**
   * Retrieve the data for the nth-schedule.
   * 0-based index
   */
  getNthSchedule(index: number) {
    const row = this.getNthScheduleRow(index);

    return {
      payee: row.getByTestId('payee'),
      account: row.getByTestId('account'),
      date: row.getByTestId('date'),
      status: row.getByTestId('status'),
      amount: row.getByTestId('amount'),
    };
  }

  /**
   * Create a transaction for the nth-schedule.
   * 0-based index
   */
  async postNthSchedule(index: number) {
    await this._performNthAction(index, 'Post transaction today');
  }

  /**
   * Complete the nth-schedule.
   * 0-based index
   */
  async completeNthSchedule(index: number) {
    await this._performNthAction(index, 'Complete');
  }

  async _performNthAction(index: number, actionName: string | RegExp) {
    const row = this.getNthScheduleRow(index);
    const actions = row.getByTestId('actions');

    await actions.getByRole('button').click();
    await this.page.getByRole('button', {name: actionName}).click();
  }

  async rightClickNthSchedule(index: number) {
    await this.getNthScheduleRow(index).click({button: 'right'});
  }
}
