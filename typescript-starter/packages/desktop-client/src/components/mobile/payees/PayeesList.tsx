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

import { GridList, ListLayout, Virtualizer } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { PayeeEntity } from '@actual-app/core/types/models';

import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';

import { PayeesListItem } from './PayeesListItem';

type PayeesListProps = {
  payees: PayeeEntity[];
  ruleCounts: Map<string, number>;
  isRuleCountsLoading?: boolean;
  isLoading?: boolean;
  onPayeePress: (payee: PayeeEntity) => void;
  onPayeeDelete: (payee: PayeeEntity) => void;
  onPayeeRuleAction: (payee: PayeeEntity) => void;
};

export function PayeesList({
  payees,
  ruleCounts,
  isRuleCountsLoading = false,
  isLoading = false,
  onPayeePress,
  onPayeeDelete,
  onPayeeRuleAction,
}: PayeesListProps) {
  const { t } = useTranslation();

  if (isLoading && payees.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 100,
        }}
      >
        <AnimatedLoading style={{ width: 25, height: 25 }} />
      </View>
    );
  }

  if (payees.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: theme.pageTextSubdued,
            textAlign: 'center',
          }}
        >
          <Trans>No payees found.</Trans>
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Virtualizer layout={ListLayout}>
        <GridList
          aria-label={t('Payees')}
          aria-busy={isLoading || undefined}
          items={payees}
          style={{
            flex: 1,
            paddingBottom: MOBILE_NAV_HEIGHT,
            overflow: 'auto',
          }}
          dependencies={[ruleCounts, isRuleCountsLoading]}
        >
          {payee => (
            <PayeesListItem
              value={payee}
              ruleCount={ruleCounts.get(payee.id) ?? 0}
              isRuleCountLoading={isRuleCountsLoading}
              onAction={() => onPayeePress(payee)}
              onDelete={() => onPayeeDelete(payee)}
              onViewRules={() => onPayeeRuleAction(payee)}
            />
          )}
        </GridList>
      </Virtualizer>
      {isLoading && (
        <View
          style={{
            alignItems: 'center',
            paddingTop: 20,
          }}
        >
          <AnimatedLoading style={{ width: 20, height: 20 }} />
        </View>
      )}
    </View>
  );
}
