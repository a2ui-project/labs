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

import type {balanceTypeOpType, GroupedEntity} from '@actual-app/core/types/models';

export function filterEmptyRows({
  showEmpty,
  data,
  balanceTypeOp = 'totalDebts',
}: {
  showEmpty: boolean;
  data: GroupedEntity;
  balanceTypeOp?: balanceTypeOpType;
}): boolean {
  let showHide: boolean;
  if (balanceTypeOp === 'totalTotals' || balanceTypeOp === 'totalBudgeted') {
    showHide = data['totalDebts'] !== 0 || data['totalAssets'] !== 0 || data[balanceTypeOp] !== 0;
  } else {
    showHide = data[balanceTypeOp] !== 0;
  }
  return !showEmpty ? showHide : true;
}
