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

import { Trans } from 'react-i18next';

import { amountToInteger } from '@actual-app/core/shared/util';
import type { PeriodicTemplate } from '@actual-app/core/types/models/templates';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { FinancialText } from '#components/FinancialText';
import { useFormat } from '#hooks/useFormat';

type FixedAutomationReadOnlyProps = {
  template: PeriodicTemplate;
};

export function FixedAutomationReadOnly({
  template,
}: FixedAutomationReadOnlyProps) {
  const format = useFormat();
  const amount = format(
    amountToInteger(template.amount, format.currency.decimalPlaces),
    'financial',
  );
  const periodAmount = template.period?.amount ?? 1;
  const periodUnit = template.period?.period ?? 'month';

  switch (periodUnit) {
    case 'day':
      return (
        <Trans count={periodAmount}>
          Budget{' '}
          <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          every {{ count: periodAmount }} days
        </Trans>
      );
    case 'week':
      return (
        <Trans count={periodAmount}>
          Budget{' '}
          <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          every {{ count: periodAmount }} weeks
        </Trans>
      );
    case 'month':
      return (
        <Trans count={periodAmount}>
          Budget{' '}
          <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          every {{ count: periodAmount }} months
        </Trans>
      );
    case 'year':
      return (
        <Trans count={periodAmount}>
          Budget{' '}
          <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          every {{ count: periodAmount }} years
        </Trans>
      );
    default:
      return null;
  }
}
