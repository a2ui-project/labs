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

import { useCallback, useMemo } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';

import { categoryBalance } from '#spreadsheet/bindings';

import { useCategory } from './useCategory';
import { useCategoryScheduleGoalTemplates } from './useCategoryScheduleGoalTemplates';
import { usePreviewTransactions } from './usePreviewTransactions';
import { useSheetValue } from './useSheetValue';

type UseCategoryPreviewTransactionsProps = {
  categoryId: CategoryEntity['id'];
  month: string;
};

type UseCategoryPreviewTransactionsResult = ReturnType<
  typeof usePreviewTransactions
>;

export function useCategoryPreviewTransactions({
  categoryId,
  month,
}: UseCategoryPreviewTransactionsProps): UseCategoryPreviewTransactionsResult {
  const { data: category } = useCategory(categoryId);
  const { schedules } = useCategoryScheduleGoalTemplates({
    category,
  });

  const schedulesToPreview = useMemo(
    () =>
      new Set(
        schedules
          .filter(schedule => monthUtils.getMonth(schedule.next_date) === month)
          .map(schedule => schedule.id),
      ),
    [month, schedules],
  );
  const categoryBalanceValue = useSheetValue<'category', 'balance'>(
    categoryBalance(categoryId, month),
  );

  const categorySchedulesFilter = useCallback(
    (schedule: ScheduleEntity) => schedulesToPreview.has(schedule.id),
    [schedulesToPreview],
  );

  const {
    previewTransactions: allPreviewTransactions,
    runningBalances: allRunningBalances,
    isLoading,
    error,
  } = usePreviewTransactions({
    filter: categorySchedulesFilter,
    options: {
      startingBalance: categoryBalanceValue ?? 0,
    },
  });

  return useMemo(() => {
    if (!category || !schedulesToPreview.size) {
      return {
        previewTransactions: [],
        runningBalances: new Map(),
        isLoading,
        error,
      };
    }

    const previewTransactions = allPreviewTransactions.filter(
      transaction =>
        transaction.schedule && schedulesToPreview.has(transaction.schedule),
    );

    const transactionIds = new Set(previewTransactions.map(t => t.id));
    const runningBalances = new Map(
      [...allRunningBalances].filter(([id]) => transactionIds.has(id)),
    );

    return {
      previewTransactions,
      runningBalances,
      isLoading,
      error,
    };
  }, [
    allPreviewTransactions,
    allRunningBalances,
    category,
    error,
    isLoading,
    schedulesToPreview,
  ]);
}
