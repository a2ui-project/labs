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

import React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';

import { useFeatureFlag } from '#hooks/useFeatureFlag';

type BudgetMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  onCopyLastMonthAverage: () => void;
  onSetMonthsAverage: (numberOfMonths: number) => void;
  onApplyBudgetTemplate: () => void;
};
export function BudgetMenu({
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
  ...props
}: BudgetMenuProps) {
  const { t } = useTranslation();

  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const onMenuSelect = (name: string) => {
    switch (name) {
      case 'copy-single-last':
        onCopyLastMonthAverage?.();
        break;
      case 'set-single-3-avg':
        onSetMonthsAverage?.(3);
        break;
      case 'set-single-6-avg':
        onSetMonthsAverage?.(6);
        break;
      case 'set-single-12-avg':
        onSetMonthsAverage?.(12);
        break;
      case 'apply-single-category-template':
        onApplyBudgetTemplate?.();
        break;
      default:
        throw new Error(`Unrecognized menu item: ${name}`);
    }
  };

  return (
    <Menu
      {...props}
      onMenuSelect={onMenuSelect}
      items={[
        {
          name: 'copy-single-last',
          text: t("Copy last month's budget"),
        },
        {
          name: 'set-single-3-avg',
          text: t('Set to 3 month average'),
        },
        {
          name: 'set-single-6-avg',
          text: t('Set to 6 month average'),
        },
        {
          name: 'set-single-12-avg',
          text: t('Set to yearly average'),
        },
        ...(isGoalTemplatesEnabled
          ? [
              {
                name: 'apply-single-category-template',
                text: t('Overwrite with template'),
              },
            ]
          : []),
      ]}
    />
  );
}
