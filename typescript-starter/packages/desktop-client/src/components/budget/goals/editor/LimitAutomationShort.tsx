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
import type { LimitTemplate } from '@actual-app/core/types/models/templates';

import { useFormat } from '#hooks/useFormat';

type LimitAutomationShortProps = {
  template: LimitTemplate;
};

export const LimitAutomationShort = ({
  template,
}: LimitAutomationShortProps) => {
  const format = useFormat();
  const amount = format(
    amountToInteger(template.amount, format.currency.decimalPlaces),
    'financial',
  );

  switch (template.period) {
    case 'daily':
      return <Trans>{{ amount }} / day</Trans>;
    case 'weekly':
      return <Trans>{{ amount }} / week</Trans>;
    case 'monthly':
      return <Trans>{{ amount }} / month</Trans>;
    default:
      return null;
  }
};
