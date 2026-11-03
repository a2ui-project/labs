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
import type {
  ByTemplate,
  SpendTemplate,
} from '@actual-app/core/types/models/templates';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { formatMonthLabel } from '#components/budget/goals/formatMonthLabel';
import { FinancialText } from '#components/FinancialText';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

type BySaveAutomationReadOnlyProps = {
  template: ByTemplate | SpendTemplate;
};

export const BySaveAutomationReadOnly = ({
  template,
}: BySaveAutomationReadOnlyProps) => {
  const format = useFormat();
  const locale = useLocale();
  const amount = format(
    amountToInteger(template.amount, format.currency.decimalPlaces),
    'financial',
  );
  const month = formatMonthLabel(template.month, locale);
  const repeat = template.repeat ?? 1;
  const from =
    template.type === 'spend' ? formatMonthLabel(template.from, locale) : null;

  if (template.annual) {
    if (from) {
      return (
        <Trans count={repeat}>
          Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          by {{ month }}, early spending from {{ from }}, repeating every{' '}
          {{ count: repeat }} years
        </Trans>
      );
    }
    return (
      <Trans count={repeat}>
        Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
        by {{ month }}, repeating every {{ count: repeat }} years
      </Trans>
    );
  }

  if (template.repeat && template.repeat > 0) {
    if (from) {
      return (
        <Trans count={repeat}>
          Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
          by {{ month }}, early spending from {{ from }}, repeating every{' '}
          {{ count: repeat }} months
        </Trans>
      );
    }
    return (
      <Trans count={repeat}>
        Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
        by {{ month }}, repeating every {{ count: repeat }} months
      </Trans>
    );
  }

  if (from) {
    return (
      <Trans>
        Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText>{' '}
        by {{ month }}, early spending from {{ from }}
      </Trans>
    );
  }

  return (
    <Trans>
      Save <FinancialText>{{ amount } as TransObjectLiteral}</FinancialText> by{' '}
      {{ month }}
    </Trans>
  );
};
