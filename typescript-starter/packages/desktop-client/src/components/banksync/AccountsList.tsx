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

import {View} from '@actual-app/components/view';
import type {AccountEntity} from '@actual-app/core/types/models';

import {useLocale} from '#hooks/useLocale';

import {AccountRow} from './AccountRow';

type AccountsListProps = {
  accounts: AccountEntity[];
  hoveredAccount?: string | null;
  onHover: (id: AccountEntity['id'] | null) => void;
  onAction: (account: AccountEntity, action: 'link' | 'edit') => void;
};

export function AccountsList({accounts, hoveredAccount, onHover, onAction}: AccountsListProps) {
  const locale = useLocale();

  if (accounts.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        marginBottom: -1,
      }}
    >
      {accounts.map(account => {
        const hovered = hoveredAccount === account.id;

        return (
          <AccountRow
            key={account.id}
            account={account}
            hovered={hovered}
            onHover={onHover}
            onAction={onAction}
            locale={locale}
          />
        );
      })}
    </View>
  );
}
