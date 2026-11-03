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

import { FIELD_TYPES, makeValue } from '@actual-app/core/shared/rules';
import type { RuleConditionEntity } from '@actual-app/core/types/models';

export function updateFilterReducer<T extends RuleConditionEntity>(
  state: Pick<T, 'op' | 'field'> & { value: T['value'] | null },
  action:
    | { type: 'set-op'; op: T['op'] }
    | { type: 'set-value'; value: T['value'] },
) {
  switch (action.type) {
    case 'set-op': {
      const type = FIELD_TYPES.get(state.field);
      let value = state.value;
      if (
        (type === 'id' || type === 'string') &&
        state.field !== 'notes' &&
        (action.op === 'contains' ||
          action.op === 'matches' ||
          action.op === 'is' ||
          action.op === 'doesNotContain' ||
          action.op === 'isNot' ||
          action.op === 'hasTags' ||
          action.op === 'hasAnyTag' ||
          action.op === 'onBudget' ||
          action.op === 'offBudget')
      ) {
        // When switching to single-value operators, convert array to first element
        if (Array.isArray(value)) {
          value = value.length > 0 ? value[0] : null;
        }
      } else if (
        (type === 'id' || type === 'string') &&
        state.field !== 'notes' &&
        (action.op === 'oneOf' || action.op === 'notOneOf')
      ) {
        // Convert single value to array when switching to oneOf/notOneOf
        if (value === null || value === undefined) {
          value = [];
        } else if (!Array.isArray(value)) {
          // @ts-expect-error - fix me
          value = [value];
        }
      }
      return { ...state, op: action.op, value };
    }
    case 'set-value': {
      const { value } = makeValue(action.value, {
        type: FIELD_TYPES.get(state.field),
      });
      return { ...state, value };
    }
    default:
      // @ts-expect-error - fix me
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}
