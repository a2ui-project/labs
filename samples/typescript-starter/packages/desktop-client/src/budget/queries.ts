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

import {send} from '@actual-app/core/platform/client/connection';
import type {CategoryEntity, CategoryGroupEntity} from '@actual-app/core/types/models';
import {queryOptions} from '@tanstack/react-query';
import i18n from 'i18next';

type CategoryViews = {
  grouped: CategoryGroupEntity[];
  list: CategoryEntity[];
};

export const categoryQueries = {
  all: () => ['categories'],
  lists: () => [...categoryQueries.all(), 'lists'],
  list: () =>
    queryOptions<CategoryViews>({
      queryKey: [...categoryQueries.lists()],
      queryFn: async () => {
        const categories = await send('get-categories');
        return translateStartingBalances(categories);
      },
      placeholderData: {
        grouped: [],
        list: [],
      },
      // Manually invalidated when categories change
      staleTime: Infinity,
    }),
};

function translateStartingBalances(categories: {
  grouped: CategoryGroupEntity[];
  list: CategoryEntity[];
}): CategoryViews {
  return {
    list: translateStartingBalancesCategories(categories.list) ?? [],
    grouped: categories.grouped.map(group => ({
      ...group,
      categories: translateStartingBalancesCategories(group.categories),
    })),
  };
}

function translateStartingBalancesCategories(
  categories: CategoryEntity[] | undefined,
): CategoryEntity[] | undefined {
  return categories ? categories.map(cat => translateStartingBalancesCategory(cat)) : undefined;
}

function translateStartingBalancesCategory(category: CategoryEntity): CategoryEntity {
  return {
    ...category,
    name:
      category.name?.toLowerCase() === 'starting balances'
        ? i18n.t('Starting Balances')
        : category.name,
  };
}
