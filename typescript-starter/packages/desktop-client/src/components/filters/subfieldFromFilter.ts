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

import type { RuleConditionEntity } from '@actual-app/core/types/models';

export function subfieldFromFilter({
  field,
  options,
  value,
}: Pick<RuleConditionEntity, 'field' | 'options' | 'value'>) {
  if (field === 'date') {
    if (typeof value === 'string') {
      if (value.length === 7) {
        return 'month';
      } else if (value.length === 4) {
        return 'year';
      }
    }
  }

  if (field === 'amount') {
    if (options && options.inflow) {
      return 'amount-inflow';
    } else if (options && options.outflow) {
      return 'amount-outflow';
    }
  }

  return field;
}
