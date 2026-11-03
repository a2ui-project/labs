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

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCategories } from '#hooks/useCategories';

export function useBudgetAutomationCategories() {
  const { t } = useTranslation();
  const { data: { grouped } = { grouped: [] } } = useCategories();
  const categories = useMemo(() => {
    const incomeGroups = grouped.filter(group => group.is_income);
    return [
      {
        id: '',
        name: t('Special categories'),
        categories: [
          { id: 'all income', group: '', name: t('Total of all income') },
          {
            id: 'available funds',
            group: '',
            name: t('Available funds to budget'),
          },
        ],
      },
      ...incomeGroups.map(group => ({
        ...group,
        name: t('Income categories'),
      })),
    ];
  }, [grouped, t]);

  return categories;
}
