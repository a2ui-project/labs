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

import type { AccountEntity } from './account';
import type { PayeeEntity } from './payee';
import type { RuleActionEntity, RuleConditionEntity, RuleEntity } from './rule';

export type RecurPattern = {
  value: number;
  type: 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'day';
};

export type RecurConfig = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  patterns?: RecurPattern[];
  skipWeekend?: boolean;
  start: string;
  endMode?: 'never' | 'after_n_occurrences' | 'on_date';
  endOccurrences?: number;
  endDate?: string;
  weekendSolveMode?: 'before' | 'after';
};

export type ScheduleEntity = {
  id: string;
  name?: string;
  rule: RuleEntity['id'];
  next_date: string;
  completed: boolean;
  posts_transaction: boolean;
  custom_upcoming_length?: string | null;
  tombstone: boolean;
  sort_order?: number;

  // These are special fields that are actually pulled from the
  // underlying rule
  _payee: PayeeEntity['id'];
  _account: AccountEntity['id'];
  _amount: number | { num1: number; num2: number };
  _amountOp: string;
  _date: RecurConfig | string;
  _conditions: RuleConditionEntity[];
  _actions: RuleActionEntity[];
  _has_splits?: boolean;
};

export type DiscoverScheduleEntity = {
  id: ScheduleEntity['id'];
  account: AccountEntity['id'];
  payee: PayeeEntity['id'];
  date: RecurConfig;
  amount: ScheduleEntity['_amount'];
  _conditions: ScheduleEntity['_conditions'];
};
