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

import type {Query} from '@actual-app/core/shared/query';
import type {TransactionEntity} from '@actual-app/core/types/models';
import {infiniteQueryOptions, keepPreviousData} from '@tanstack/react-query';

import {aqlQuery} from '#queries/aqlQuery';

export const transactionQueries = {
  all: () => ['transactions'],
  aql: ({query, pageSize = 50}: {query?: Query; pageSize?: number}) =>
    infiniteQueryOptions<TransactionEntity[]>({
      queryKey: [...transactionQueries.all(), 'aql', query, pageSize],
      queryFn: async ({pageParam}) => {
        if (!query) {
          // Shouldn't happen because of the enabled flag, but needed to satisfy TS
          throw new Error('No query provided.');
        }
        const queryWithOffset = query.offset((pageParam as number) * pageSize).limit(pageSize);

        const {data}: {data: TransactionEntity[]} = await aqlQuery(queryWithOffset);
        return data;
      },
      placeholderData: keepPreviousData,
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) => {
        return lastPage.length < pageSize ? undefined : pages.length;
      },
      enabled: !!query,
    }),
};
