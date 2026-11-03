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
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { trackingBudget } from '#spreadsheet/bindings';

import { BudgetTotal } from './BudgetTotal';
import { IncomeProgress } from './IncomeProgress';

type IncomeTotalProps = {
  style?: CSSProperties;
};
export function IncomeTotal({ style }: IncomeTotalProps) {
  const { t } = useTranslation();
  return (
    <BudgetTotal
      title={t('Income')}
      current={trackingBudget.totalIncome}
      target={trackingBudget.totalBudgetedIncome}
      ProgressComponent={IncomeProgress}
      style={style}
    />
  );
}
