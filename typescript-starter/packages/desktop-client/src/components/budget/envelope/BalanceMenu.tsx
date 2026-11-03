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

import { envelopeBudget } from '#spreadsheet/bindings';

import { useEnvelopeSheetValue } from './EnvelopeBudgetComponents';

type BalanceMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  categoryId: string;
  onTransfer?: () => void;
  onCarryover?: (carryOver: boolean) => void;
  onCover?: () => void;
};

export function BalanceMenu({
  categoryId,
  onTransfer,
  onCarryover,
  onCover,
  ...props
}: BalanceMenuProps) {
  const { t } = useTranslation();

  const carryover = useEnvelopeSheetValue(
    envelopeBudget.catCarryover(categoryId),
  );
  const balance =
    useEnvelopeSheetValue(envelopeBudget.catBalance(categoryId)) ?? 0;

  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'transfer':
            onTransfer?.();
            break;
          case 'carryover':
            onCarryover?.(!carryover);
            break;
          case 'cover':
            onCover?.();
            break;
          default:
            throw new Error(`Unrecognized menu option: ${name}`);
        }
      }}
      items={[
        ...(balance > 0
          ? [
              {
                name: 'transfer',
                text: t('Transfer to another category'),
              },
            ]
          : []),
        ...(balance < 0
          ? [
              {
                name: 'cover',
                text: t('Cover overspending'),
              },
            ]
          : []),
        {
          name: 'carryover',
          text: carryover
            ? t('Remove overspending rollover')
            : t('Rollover overspending'),
        },
      ]}
    />
  );
}
