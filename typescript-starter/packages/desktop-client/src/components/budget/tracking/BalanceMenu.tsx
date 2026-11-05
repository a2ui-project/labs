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

import {trackingBudget} from '#spreadsheet/bindings';

import {useTrackingSheetValue} from './TrackingBudgetComponents';

type BalanceMenuProps = Omit<ComponentPropsWithoutRef<typeof Menu>, 'onMenuSelect' | 'items'> & {
  categoryId: string;
  onCarryover: (carryover: boolean) => void;
};

export function BalanceMenu({categoryId, onCarryover, ...props}: BalanceMenuProps) {
  const {t} = useTranslation();
  const carryover = useTrackingSheetValue(trackingBudget.catCarryover(categoryId));
  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'carryover':
            onCarryover?.(!carryover);
            break;
          default:
            throw new Error(`Unrecognized menu option: ${String(name)}`);
        }
      }}
      items={[
        {
          name: 'carryover',
          text: carryover ? t('Remove overspending rollover') : t('Rollover overspending'),
        },
      ]}
    />
  );
}
