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
import type { ComponentProps } from 'react';

import { theme } from '@actual-app/components/theme';

import type { CellValue } from '#components/spreadsheet/CellValue';
import { useSheetValue } from '#hooks/useSheetValue';

import { fraction } from './fraction';
import { PieProgress } from './PieProgress';

type IncomeProgressProps = {
  current: ComponentProps<typeof CellValue>['binding'];
  target: ComponentProps<typeof CellValue>['binding'];
};
export function IncomeProgress({ current, target }: IncomeProgressProps) {
  let totalIncome = useSheetValue(current) || 0;
  const totalBudgeted = useSheetValue(target) || 0;

  let over = false;

  if (totalIncome < 0) {
    over = true;
    totalIncome = -totalIncome;
  }

  const frac = fraction(totalIncome, totalBudgeted);

  return (
    <PieProgress
      progress={frac}
      color={over ? theme.numberNegative : theme.numberPositive}
      backgroundColor={over ? theme.errorBackground : theme.budgetCurrentMonth}
      style={{ width: 20, height: 20 }}
    />
  );
}
