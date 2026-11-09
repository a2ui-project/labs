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
import type {ComponentPropsWithoutRef} from 'react';
import {useTranslation} from 'react-i18next';

import {Menu} from '@actual-app/components/menu';

import {useEnvelopeSheetValue} from '#components/budget/envelope/EnvelopeBudgetComponents';
import {envelopeBudget} from '#spreadsheet/bindings';

type ToBudgetMenuProps = Omit<ComponentPropsWithoutRef<typeof Menu>, 'onMenuSelect' | 'items'> & {
  onTransfer: () => void;
  onCover: () => void;
  onHoldBuffer: () => void;
  onResetHoldBuffer: () => void;
  onBudgetAction?: (month: string, action: string, arg?: unknown) => void;
  month: string;
};

export function ToBudgetMenu({
  onTransfer,
  onCover,
  onHoldBuffer,
  onResetHoldBuffer,
  onBudgetAction,
  month,
  ...props
}: ToBudgetMenuProps) {
  const {t} = useTranslation();

  const toBudget = useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0;
  const forNextMonth = useEnvelopeSheetValue(envelopeBudget.forNextMonth) ?? 0;
  const manualBuffered = useEnvelopeSheetValue(envelopeBudget.manualBuffered) ?? 0;
  const autoBuffered = useEnvelopeSheetValue(envelopeBudget.autoBuffered) ?? 0;
  const items = [
    ...(toBudget > 0
      ? [
          {
            name: 'transfer',
            text: t('Move to a category'),
          },
        ]
      : []),
    ...(autoBuffered === 0 && toBudget > 0
      ? [
          {
            name: 'buffer',
            text: t('Hold for next month'),
          },
        ]
      : []),
    ...(toBudget < 0
      ? [
          {
            name: 'cover',
            text: t('Cover from a category'),
          },
        ]
      : []),
    ...(forNextMonth > 0 && manualBuffered === 0
      ? [
          {
            name: 'disable-auto-buffer',
            text: t('Disable current auto hold'),
          },
        ]
      : []),
    ...(forNextMonth > 0 && manualBuffered !== 0
      ? [
          {
            name: 'reset-buffer',
            text: t("Reset next month's buffer"),
          },
        ]
      : []),
  ];

  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'transfer':
            onTransfer?.();
            break;
          case 'cover':
            onCover?.();
            break;
          case 'buffer':
            onHoldBuffer?.();
            onBudgetAction?.(month, 'reset-income-carryover', {});
            break;
          case 'reset-buffer':
            onResetHoldBuffer?.();
            break;
          case 'disable-auto-buffer':
            onBudgetAction?.(month, 'reset-income-carryover', {});
            break;
          default:
            throw new Error(`Unrecognized menu option: ${name}`);
        }
      }}
      items={
        items.length > 0
          ? items
          : [
              {
                name: 'none',
                text: t('No actions available'),
                disabled: true,
              },
            ]
      }
    />
  );
}
