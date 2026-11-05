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

import {useTranslation} from 'react-i18next';

import {SpaceBetween} from '@actual-app/components/space-between';
import {amountToInteger, integerToAmount} from '@actual-app/core/shared/util';
import type {GoalTemplate} from '@actual-app/core/types/models/templates';

import {updateTemplate} from '#components/budget/goals/actions';
import type {Action} from '#components/budget/goals/actions';
import {FormField, FormLabel} from '#components/forms';
import {AmountInput} from '#components/util/AmountInput';
import {useFormat} from '#hooks/useFormat';

type LongTermGoalAutomationProps = {
  template: GoalTemplate;
  dispatch: (action: Action) => void;
};

export function LongTermGoalAutomation({template, dispatch}: LongTermGoalAutomationProps) {
  const {t} = useTranslation();
  const format = useFormat();
  const amount = amountToInteger(template.amount, format.currency.decimalPlaces);

  return (
    <SpaceBetween align="center" gap={10} style={{marginTop: 10}}>
      <FormField style={{flex: 1}}>
        <FormLabel title={t('Target amount')} htmlFor="goal-amount-field" />
        <AmountInput
          id="goal-amount-field"
          value={amount}
          sign="+"
          onUpdate={(value: number) =>
            dispatch(
              updateTemplate({
                type: 'goal',
                amount: integerToAmount(value, format.currency.decimalPlaces),
              }),
            )
          }
        />
      </FormField>
    </SpaceBetween>
  );
}
