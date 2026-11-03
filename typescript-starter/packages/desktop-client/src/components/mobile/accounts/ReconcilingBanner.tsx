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

import React, { useState } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheckCircle1 } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { useFormat } from '#hooks/useFormat';
import { useSheetValue } from '#hooks/useSheetValue';
import * as bindings from '#spreadsheet/bindings';

type ReconcilingBannerProps = {
  account: AccountEntity;
  targetBalance: number;
  onDone: () => Promise<void>;
  onCreateTransaction: (targetDiff: number) => Promise<void>;
};

export function ReconcilingBanner({
  account,
  targetBalance,
  onDone,
  onCreateTransaction,
}: ReconcilingBannerProps) {
  const format = useFormat();
  const cleared = useSheetValue<'account', 'balanceCleared'>(
    bindings.accountBalanceCleared(account.id),
  );
  const [isUpdating, setIsUpdating] = useState(false);

  if (cleared == null) {
    return null;
  }

  const runAction = async (action: () => Promise<void>) => {
    setIsUpdating(true);
    try {
      await action();
    } finally {
      setIsUpdating(false);
    }
  };

  const targetDiff = targetBalance - cleared;

  const clearedBalance = format(cleared, 'financial');
  const bankBalance = format(targetBalance, 'financial');
  const difference =
    (targetDiff > 0 ? '+' : '') + format(targetDiff, 'financial');

  const isBalanced = targetDiff === 0;

  // both states stay rendered so the banner keeps the height of the taller one
  return (
    <View
      data-testid="reconciling-banner"
      style={{
        flexShrink: 0,
        display: 'grid',
        backgroundColor: theme.tableBackground,
        ...styles.shadow,
        borderRadius: 4,
        margin: '10px 10px 0 10px',
        padding: 10,
      }}
    >
      <View
        style={{
          gridArea: '1 / 1',
          justifyContent: 'center',
          gap: 10,
          ...(!isBalanced && { visibility: 'hidden' }),
        }}
      >
        <View
          style={{
            color: theme.noticeTextLight,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SvgCheckCircle1
            style={{
              width: 13,
              height: 13,
              color: 'inherit',
              marginRight: 3,
            }}
          />
          <Trans>All reconciled!</Trans>
        </View>
        <Button
          variant="primary"
          isDisabled={isUpdating}
          style={{ height: styles.mobileMinHeight }}
          onPress={() => runAction(onDone)}
        >
          <Trans>Lock transactions</Trans>
        </Button>
      </View>
      <View
        style={{
          gridArea: '1 / 1',
          justifyContent: 'center',
          gap: 10,
          ...(isBalanced && { visibility: 'hidden' }),
        }}
      >
        <Text
          style={{
            color: theme.tableText,
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          <Trans>
            Your cleared balance{' '}
            <strong>{{ clearedBalance } as TransObjectLiteral}</strong> needs{' '}
            <strong>{{ difference } as TransObjectLiteral}</strong> to match
            your bank&apos;s balance of{' '}
            <Text style={{ fontWeight: 700 }}>
              {{ bankBalance } as TransObjectLiteral}
            </Text>
          </Trans>
        </Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <Button
            isDisabled={isUpdating}
            style={{ flex: 1, minHeight: styles.mobileMinHeight }}
            onPress={() => runAction(() => onCreateTransaction(targetDiff))}
          >
            <Trans>Create reconciliation transaction</Trans>
          </Button>
          <Button
            variant="primary"
            isDisabled={isUpdating}
            style={{ flex: 1, minHeight: styles.mobileMinHeight }}
            onPress={() => runAction(onDone)}
          >
            <Trans>Exit reconciliation</Trans>
          </Button>
        </View>
      </View>
    </View>
  );
}
