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

import {integerToAmount} from '@actual-app/core/shared/util';
// Use the browser ESM build: the default `csv-stringify/sync` entry pulls in
// the Node build (which imports `stream`), breaking the lazy-loaded reports
// chunk in the browser bundle. The browser ESM build is self-contained.
import {stringify as csvStringify} from 'csv-stringify/browser/esm/sync';
import {t} from 'i18next';

type IntervalRow = {
  date: string;
  budgeted: number;
  spent: number;
  balance: number;
  overspendingAdjustment: number;
};

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

export function buildBudgetAnalysisCsv(rows: IntervalRow[]): string {
  const month = t('Month');
  const budgeted = t('Budgeted');
  const spent = t('Spent');
  const overspendingAdjustment = t('Overspending Adjustment');
  const balance = t('Balance');

  const columns = [month, budgeted, spent, overspendingAdjustment, balance];

  return csvStringify(
    rows.map(row => [
      row.date,
      integerToAmount(row.budgeted),
      integerToAmount(row.spent),
      integerToAmount(row.overspendingAdjustment),
      integerToAmount(row.balance),
    ]),
    {
      header: true,
      columns,
      cast: {
        string: (value: string) => (FORMULA_TRIGGERS.test(value) ? "'" + value : value),
      },
    },
  );
}
