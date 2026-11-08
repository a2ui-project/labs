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

import {extractScheduleConds} from '@actual-app/core/shared/schedules';
import type {
  RuleConditionEntity,
  RuleConditionOp,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import {t} from 'i18next';

import type {ScheduleFormFields} from './ScheduleEditForm';

export function updateScheduleConditions(
  schedule: Partial<ScheduleEntity>,
  fields: ScheduleFormFields,
): {error?: string; conditions?: RuleConditionEntity[]} {
  const conds = extractScheduleConds(schedule._conditions);

  const updateCond = (
    cond: ReturnType<typeof extractScheduleConds>[keyof ReturnType<typeof extractScheduleConds>],
    op: RuleConditionOp,
    field: string,
    value: (typeof fields)[keyof typeof fields],
  ) => {
    if (cond) {
      return {...cond, value};
    }

    if (value != null || field === 'payee') {
      return {op, field, value};
    }

    return null;
  };

  // Validate
  if (fields.date == null) {
    return {error: t('Date is required'), conditions: []};
  }

  if (fields.amount == null) {
    return {error: t('A valid amount is required'), conditions: []};
  }

  return {
    conditions: [
      updateCond(conds.payee, 'is', 'payee', fields.payee),
      updateCond(conds.account, 'is', 'account', fields.account),
      updateCond(conds.date, 'isapprox', 'date', fields.date),
      // We don't use `updateCond` for amount because we want to
      // overwrite it completely
      {
        op: (fields.amountOp || 'isapprox') as RuleConditionOp,
        field: 'amount',
        value: fields.amount,
      },
    ].filter((val): val is RuleConditionEntity => val != null),
  };
}
