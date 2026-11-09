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

import type {RuleConditionEntity} from '@actual-app/core/types/models';

export function subfieldToOptions(field: string, subfield: string) {
  let setOptions: RuleConditionEntity['options'];
  switch (field) {
    case 'amount':
      switch (subfield) {
        case 'amount-inflow':
          setOptions = {inflow: true};
          break;
        case 'amount-outflow':
          setOptions = {outflow: true};
          break;
        default:
          break;
      }
      break;
    case 'date':
      switch (subfield) {
        case 'month':
          setOptions = {month: true};
          break;
        case 'year':
          setOptions = {year: true};
          break;
        default:
          break;
      }
      break;
    default:
      break;
  }
  return setOptions;
}
