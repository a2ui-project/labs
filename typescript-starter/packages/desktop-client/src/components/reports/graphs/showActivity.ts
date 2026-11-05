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

import type {NavigateFunction} from 'react-router';

import * as monthUtils from '@actual-app/core/shared/months';
import type {
  AccountEntity,
  balanceTypeOpType,
  CategoryEntity,
  CategoryGroupEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import {ReportOptions} from '#components/reports/ReportOptions';

type showActivityProps = {
  navigate: NavigateFunction;
  categories: {list: CategoryEntity[]; grouped: CategoryGroupEntity[]};
  accounts: AccountEntity[];
  balanceTypeOp: balanceTypeOpType;
  filters: RuleConditionEntity[];
  showHiddenCategories: boolean;
  showOffBudget: boolean;
  type: string;
  startDate: string;
  endDate?: string;
  field?: string; // 'group' becomes a category_group filter
  id?: string | string[]; // changed: supports array for oneOf
  uncategorizedId?: 'off_budget' | 'transfer' | 'other' | 'all';
  interval?: string;
};

export function showActivity({
  navigate,
  categories,
  accounts,
  balanceTypeOp,
  filters,
  showHiddenCategories,
  showOffBudget,
  type,
  startDate,
  endDate,
  field,
  id,
  uncategorizedId,
  interval = 'Day',
}: showActivityProps) {
  const isOutFlow = balanceTypeOp === 'totalDebts' || type === 'debts' ? true : false;
  const hiddenCategories = categories.list.filter(f => f.hidden).map(e => e.id);
  const offBudgetAccounts = accounts.filter(f => f.offbudget).map(e => e.id);
  const fromDate =
    interval === 'Weekly'
      ? 'dayFromDate'
      : (((ReportOptions.intervalMap.get(interval) || 'Day').toLowerCase() + 'FromDate') as
          | 'dayFromDate'
          | 'monthFromDate'
          | 'yearFromDate');
  const isDateOp = interval === 'Weekly' || type !== 'time';
  const drilldownFilter =
    field === 'category' && uncategorizedId === 'transfer'
      ? {
          field: 'transfer',
          op: 'is',
          value: true,
          type: 'boolean',
        }
      : field === 'group'
        ? !uncategorizedId &&
          id && {
            field: 'category_group',
            op: 'is',
            value: id,
            type: 'id',
          }
        : id && {
            // changed: use oneOf when id is an array, is when it's a string
            field,
            op: Array.isArray(id) ? 'oneOf' : 'is',
            value: id,
            type: 'id',
          };

  const filterConditions = [
    ...filters,
    drilldownFilter,
    {
      field: 'date',
      op: isDateOp ? 'gte' : 'is',
      value: isDateOp ? startDate : monthUtils[fromDate](startDate),
      type: 'date',
    },
    isDateOp && {
      field: 'date',
      op: 'lte',
      value: endDate,
      options: {date: true},
    },
    !(
      ['netAssets', 'netDebts'].includes(balanceTypeOp) ||
      (['totalTotals', 'totalBudgeted'].includes(balanceTypeOp) &&
        (type === 'totals' || type === 'time'))
    ) && {
      field: 'amount',
      op: 'gte',
      value: 0,
      options: {
        type: 'number',
        inflow: !isOutFlow,
        outflow: isOutFlow,
      },
    },
    hiddenCategories.length > 0 &&
      !showHiddenCategories && {
        field: 'category',
        op: 'notOneOf',
        value: hiddenCategories,
        type: 'id',
      },
    offBudgetAccounts.length > 0 &&
      !showOffBudget && {
        field: 'account',
        op: 'notOneOf',
        value: offBudgetAccounts,
        type: 'id',
      },
  ].filter(f => f);

  void navigate(balanceTypeOp === 'totalBudgeted' ? '/budget' : '/accounts', {
    state: balanceTypeOp === 'totalBudgeted' ? {goBack: true} : {goBack: true, filterConditions},
  });
}
