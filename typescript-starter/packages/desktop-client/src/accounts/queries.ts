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

import { send } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';
import { queryOptions } from '@tanstack/react-query';

function selectActive(accounts: AccountEntity[]) {
  return accounts.filter(account => !account.closed);
}

export const accountQueries = {
  all: () => ['accounts'],
  lists: () => [...accountQueries.all(), 'lists'],
  list: () =>
    queryOptions<AccountEntity[]>({
      queryKey: [...accountQueries.lists()],
      queryFn: async () => {
        const accounts: AccountEntity[] = await send('accounts-get');
        return accounts;
      },
      placeholderData: [],
      // Manually invalidated when accounts change
      staleTime: Infinity,
    }),
  listActive: () =>
    queryOptions<AccountEntity[]>({
      ...accountQueries.list(),
      select: selectActive,
    }),
  listClosed: () =>
    queryOptions<AccountEntity[]>({
      ...accountQueries.list(),
      select: accounts => accounts.filter(account => !!account.closed),
    }),
  listOnBudget: () =>
    queryOptions<AccountEntity[]>({
      ...accountQueries.list(),
      select: accounts =>
        selectActive(accounts).filter(account => !account.offbudget),
    }),
  listOffBudget: () =>
    queryOptions<AccountEntity[]>({
      ...accountQueries.list(),
      select: accounts =>
        selectActive(accounts).filter(account => !!account.offbudget),
    }),
};
