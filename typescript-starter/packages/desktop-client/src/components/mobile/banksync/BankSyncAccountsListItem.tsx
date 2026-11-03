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

import { Trans, useTranslation } from 'react-i18next';

import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { tsToRelativeTime } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useLocale } from '#hooks/useLocale';

type BankSyncAccountsListItemProps = {
  account: AccountEntity;
  onAction: (account: AccountEntity, action: 'link' | 'edit') => void;
  isLinked: boolean;
};

export function BankSyncAccountsListItem({
  account,
  onAction,
  isLinked,
}: BankSyncAccountsListItemProps) {
  const { t } = useTranslation();
  const locale = useLocale();

  const lastSyncString = isLinked
    ? tsToRelativeTime(account.last_sync, locale, {
        capitalize: true,
      })
    : null;

  return (
    <View
      data-testid="bank-sync-account"
      style={{
        backgroundColor: theme.tableBackground,
        borderBottomWidth: 1,
        borderBottomColor: theme.tableBorder,
        borderBottomStyle: 'solid',
        padding: 16,
        width: '100%',
        cursor: 'pointer',
      }}
      onClick={() => onAction(account, isLinked ? 'edit' : 'link')}
    >
      <SpaceBetween gap={60}>
        <SpaceBetween
          direction="vertical"
          gap={5}
          style={{ flex: 1, alignItems: 'flex-start' }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: theme.tableText,
            }}
          >
            {account.name}
          </Text>
          {isLinked && (
            <Text
              style={{
                fontSize: 13,
                color: theme.pageTextSubdued,
              }}
            >
              {account.bankName ?? t('Unknown')}
            </Text>
          )}
          {isLinked && lastSyncString && (
            <Text
              style={{
                fontSize: 13,
                color: theme.pageTextSubdued,
              }}
              data-vrt-mask
            >
              <Trans>Last sync: {{ time: lastSyncString }}</Trans>
            </Text>
          )}
        </SpaceBetween>

        <span
          style={{
            borderRadius: 4,
            padding: '5px 10px',
            backgroundColor: theme.noticeBackground,
            border: '1px solid ' + theme.noticeBackground,
            color: theme.noticeTextDark,
            fontSize: 13,
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {isLinked ? <Trans>Edit</Trans> : <Trans>Link account</Trans>}
        </span>
      </SpaceBetween>
    </View>
  );
}
