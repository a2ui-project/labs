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

import {useTranslation} from 'react-i18next';

import {Menu} from '@actual-app/components/menu';
import type {CategoryEntity} from '@actual-app/core/types/models';

import {envelopeBudget} from '#spreadsheet/bindings';

import {useEnvelopeSheetValue} from './EnvelopeBudgetComponents';

type IncomeMenuProps = {
  categoryId: string;
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onShowActivity: (id: CategoryEntity['id'], month: string) => void;
  onClose: () => void;
};

export function IncomeMenu({
  categoryId,
  month,
  onBudgetAction,
  onShowActivity,
  onClose,
}: IncomeMenuProps) {
  const {t} = useTranslation();
  const carryover = useEnvelopeSheetValue(envelopeBudget.catCarryover(categoryId));

  return (
    <span>
      <Menu
        onMenuSelect={name => {
          switch (name) {
            case 'view':
              onShowActivity(categoryId, month);
              break;
            case 'carryover':
              if (!carryover) onBudgetAction(month, 'reset-hold');
              onBudgetAction(month, 'carryover', {
                category: categoryId,
                flag: !carryover,
              });
              onClose();
              break;
            default:
              throw new Error(`Unrecognized menu option: ${String(name)}`);
          }
        }}
        items={[
          {
            name: 'carryover',
            text: carryover ? t('Disable auto hold') : t('Enable auto hold'),
          },
          {
            name: 'view',
            text: t('View transactions'),
          },
        ]}
      />
    </span>
  );
}
