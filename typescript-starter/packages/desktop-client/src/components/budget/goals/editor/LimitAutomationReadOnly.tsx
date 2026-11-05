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

import {Trans} from 'react-i18next';

import {amountToInteger} from '@actual-app/core/shared/util';
import type {LimitTemplate} from '@actual-app/core/types/models/templates';

import {useFormat} from '#hooks/useFormat';

type LimitAutomationReadOnlyProps = {
  template: LimitTemplate;
};

export const LimitAutomationReadOnly = ({template}: LimitAutomationReadOnlyProps) => {
  const format = useFormat();

  const period = template.period;
  const amount = format(
    amountToInteger(template.amount, format.currency.decimalPlaces),
    'financial',
  );
  const hold = template.hold;

  switch (period) {
    case 'daily':
      return hold ? (
        <Trans>Set a balance limit of {{daily: amount}}/day (soft cap)</Trans>
      ) : (
        <Trans>Set a balance limit of {{daily: amount}}/day (hard cap)</Trans>
      );
    case 'weekly':
      return hold ? (
        <Trans>Set a balance limit of {{weekly: amount}}/week (soft cap)</Trans>
      ) : (
        <Trans>Set a balance limit of {{weekly: amount}}/week (hard cap)</Trans>
      );
    case 'monthly':
      return hold ? (
        <Trans>Set a balance limit of {{monthly: amount}}/month (soft cap)</Trans>
      ) : (
        <Trans>Set a balance limit of {{monthly: amount}}/month (hard cap)</Trans>
      );
    default:
      return null;
  }
};
