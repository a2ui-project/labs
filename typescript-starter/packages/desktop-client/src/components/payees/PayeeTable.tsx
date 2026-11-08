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

// @ts-strict-ignore
import {forwardRef, useCallback, useEffectEvent, useLayoutEffect, useState} from 'react';
import type {ComponentProps, ComponentRef} from 'react';

import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';
import type {PayeeEntity} from '@actual-app/core/types/models';

import {Table, useTableNavigator} from '#components/table';
import {useSelectedItems} from '#hooks/useSelected';

import {PayeeTableRow} from './PayeeTableRow';

// Table items require an ID to work, it's optional in the loot-core
// model so would need to verify accuracy of that before changing there
type PayeeWithId = PayeeEntity & Required<Pick<PayeeEntity, 'id'>>;

type PayeeTableProps = {
  payees: PayeeWithId[];
  ruleCounts: Map<PayeeWithId['id'], number>;
} & Pick<
  ComponentProps<typeof PayeeTableRow>,
  'onUpdate' | 'onDelete' | 'onViewRules' | 'onCreateRule'
>;

export const PayeeTable = forwardRef<ComponentRef<typeof Table<PayeeWithId>>, PayeeTableProps>(
  ({payees, ruleCounts, onUpdate, onDelete, onViewRules, onCreateRule}, ref) => {
    const [hovered, setHovered] = useState(null);
    const selectedItems = useSelectedItems();

    const onScrollToSelected = useEffectEvent(() => {
      const firstSelected = [...selectedItems][0] as string;
      if (typeof ref !== 'function') {
        ref.current.scrollTo(firstSelected, 'center');
      }
    });

    useLayoutEffect(() => {
      onScrollToSelected();
    }, []);

    const onHover = useCallback(id => {
      setHovered(id);
    }, []);

    const tableNavigator = useTableNavigator(payees, item =>
      item.transfer_acct == null ? ['select', 'name', 'rule-count'] : ['rule-count'],
    );

    return (
      <View style={{flex: 1}} onMouseLeave={() => setHovered(null)}>
        <Table
          navigator={tableNavigator}
          ref={ref}
          items={payees}
          backgroundColor={theme.tableBackground}
          renderItem={({item, editing, focusedField, onEdit}) => {
            return (
              <PayeeTableRow
                payee={item}
                ruleCount={ruleCounts.get(item.id) || 0}
                selected={selectedItems.has(item.id)}
                editing={editing}
                focusedField={focusedField}
                hovered={hovered === item.id}
                onHover={onHover}
                onEdit={onEdit}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onViewRules={onViewRules}
                onCreateRule={onCreateRule}
              />
            );
          }}
        />
      </View>
    );
  },
);

PayeeTable.displayName = 'PayeeTable';
