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

import type {balanceTypeOpType, GroupedEntity, sortByOpType} from '@actual-app/core/types/models';

const reverseSort: Partial<Record<sortByOpType, sortByOpType>> = {
  asc: 'desc',
  desc: 'asc',
};

const balanceTypesToReverse = ['totalDebts', 'netDebts'];

const shouldReverse = (balanceTypeOp: balanceTypeOpType) =>
  balanceTypesToReverse.includes(balanceTypeOp);

export function sortData({
  balanceTypeOp,
  sortByOp,
}: {
  balanceTypeOp?: balanceTypeOpType;
  sortByOp?: sortByOpType;
}): (a: GroupedEntity, b: GroupedEntity) => number {
  if (!balanceTypeOp || !sortByOp) return () => 0;

  if (shouldReverse(balanceTypeOp)) {
    sortByOp = reverseSort[sortByOp] ?? sortByOp;
  }

  // Return a comparator function
  return (a, b) => {
    let comparison = 0;
    if (sortByOp === 'asc') {
      comparison = a[balanceTypeOp] - b[balanceTypeOp];
    } else if (sortByOp === 'desc') {
      comparison = b[balanceTypeOp] - a[balanceTypeOp];
    } else if (sortByOp === 'name') {
      comparison = (a.name ?? '').localeCompare(b.name ?? '');
    } else if (sortByOp === 'budget') {
      comparison = 0;
    }

    return comparison;
  };
}
