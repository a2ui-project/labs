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

import React from 'react';

import {theme} from '@actual-app/components/theme';

import {useTrackingSheetValue} from '#components/budget/tracking/TrackingBudgetComponents';
import type {Binding} from '#spreadsheet';

import {fraction} from './fraction';
import {PieProgress} from './PieProgress';

type ExpenseProgressProps = {
  current: Binding<'tracking-budget', 'total-spent'>;
  target: Binding<'tracking-budget', 'total-budgeted'>;
};
export function ExpenseProgress({current, target}: ExpenseProgressProps) {
  let totalSpent = useTrackingSheetValue(current) || 0;
  const totalBudgeted = useTrackingSheetValue(target) || 0;

  // Reverse total spent, and also set a bottom boundary of 0 (in case
  // income goes into an expense category and it's "positive", don't
  // show that in the graph)
  totalSpent = Math.max(-totalSpent, 0);

  let frac;
  let over = false;

  if (totalSpent > totalBudgeted) {
    frac = (totalSpent - totalBudgeted) / totalBudgeted;
    over = true;
  } else {
    frac = fraction(totalSpent, totalBudgeted);
  }

  return (
    <PieProgress
      progress={frac}
      color={over ? theme.numberNegative : theme.numberPositive}
      backgroundColor={over ? theme.errorBackground : theme.budgetCurrentMonth}
      style={{width: 20, height: 20}}
    />
  );
}
