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

// @ts-strict-ignore
import {useMemo} from 'react';

import {q} from '@actual-app/core/shared/query';
import type {TransactionFilterEntity} from '@actual-app/core/types/models';

import {useQuery} from './useQuery';

function toJS(rows): TransactionFilterEntity[] {
  const filters = rows.map(row => {
    return {
      ...row.fields,
      id: row.id,
      name: row.name,
      tombstone: row.tombstone,
      conditionsOp: row.conditions_op,
      conditions: row.conditions,
    } satisfies TransactionFilterEntity;
  });
  return filters;
}

export function useTransactionFilters(): TransactionFilterEntity[] {
  const {data} = useQuery<TransactionFilterEntity>(() => q('transaction_filters').select('*'), []);

  return useMemo(
    () =>
      toJS(data ? [...data] : []).sort((a, b) =>
        a.name.trim().localeCompare(b.name.trim(), undefined, {ignorePunctuation: true}),
      ),
    [data],
  );
}
