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

import type {Query} from '@actual-app/core/shared/query';

export type Spreadsheets = {
  account: {
    // Common fields
    'uncategorized-amount': number;
    'uncategorized-balance': number;

    // Account fields
    balance: number;
    [key: `balance-${string}-cleared`]: number | null;
    'accounts-balance': number;
    'onbudget-accounts-balance': number;
    'offbudget-accounts-balance': number;
    'closed-accounts-balance': number;
    [key: `account-group-balance-${string}`]: number;
    balanceCleared: number;
    balanceUncleared: number;
    lastReconciled: string | null;
  };
  category: {
    // Common fields
    'uncategorized-amount': number;
    'uncategorized-balance': number;

    balance: number;
    balanceCleared: number;
    balanceUncleared: number;
  };
  'envelope-budget': {
    // Common fields
    'uncategorized-amount': number;
    'uncategorized-balance': number;

    // Envelope budget fields
    'available-funds': number;
    'last-month-overspent': number;
    buffered: number;
    'buffered-auto': number;
    'buffered-selected': number;
    'to-budget': number | null;
    'from-last-month': number;
    'total-budgeted': number;
    'total-income': number;
    'total-spent': number;
    'total-leftover': number;
    'group-sum-amount': number;
    'group-budget': number;
    'group-leftover': number;
    budget: number;
    'sum-amount': number;
    leftover: number;
    carryover: number;
    goal: number;
    'long-goal': number;
  };
  'tracking-budget': {
    // Common fields
    'uncategorized-amount': number;
    'uncategorized-balance': number;

    // Tracking budget fields
    'total-budgeted': number;
    'total-budget-income': number;
    'total-saved': number;
    'total-income': number;
    'total-spent': number;
    'real-saved': number;
    'total-leftover': number;
    'group-sum-amount': number;
    'group-budget': number;
    'group-leftover': number;
    budget: number;
    'sum-amount': number;
    leftover: number;
    carryover: number;
    goal: number;
    'long-goal': number;
  };
  [`balance`]: {
    // Common fields
    'uncategorized-amount': number;
    'uncategorized-balance': number;

    // Balance fields
    [key: `balance-query-${string}`]: number;
    [key: `selected-transactions-${string}`]: Array<{id: string}>;
    [key: `selected-balance-${string}`]: number;
  };
};

export type SheetNames = keyof Spreadsheets & string;

export type SheetFields<SheetName extends SheetNames> = keyof Spreadsheets[SheetName] & string;

export type BindingObject<
  SheetName extends SheetNames,
  SheetFieldName extends SheetFields<SheetName>,
> = {
  name: SheetFieldName;
  value?: Spreadsheets[SheetName][SheetFieldName] | undefined;
  query?: Query | undefined;
};

export type Binding<SheetName extends SheetNames, SheetFieldName extends SheetFields<SheetName>> =
  | SheetFieldName
  | {
      name: SheetFieldName;
      value?: Spreadsheets[SheetName][SheetFieldName] | undefined;
      query?: Query | undefined;
    };
export const parametrizedField =
  <SheetName extends SheetNames>() =>
  <SheetFieldName extends SheetFields<SheetName>>(field: SheetFieldName) =>
  (id?: string): SheetFieldName =>
    `${field}-${id}` as SheetFieldName;
