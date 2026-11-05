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

import {Trans, useTranslation} from 'react-i18next';

import {SvgDelete, SvgMerge} from '@actual-app/components/icons/v0';
import {SvgBookmark, SvgLightBulb} from '@actual-app/components/icons/v1';
import {Menu} from '@actual-app/components/menu';
import type {MenuItem} from '@actual-app/components/menu';
import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';
import type {PayeeEntity} from '@actual-app/core/types/models';

import {useSyncedPref} from '#hooks/useSyncedPref';

type PayeeMenuProps = {
  payeesById: Record<PayeeEntity['id'], PayeeEntity>;
  selectedPayees: Set<PayeeEntity['id']>;
  onDelete: () => void;
  onMerge: () => Promise<void>;
  onFavorite: () => void;
  onLearn: () => void;
  onClose: () => void;
};

export function PayeeMenu({
  payeesById,
  selectedPayees,
  onDelete,
  onMerge,
  onFavorite,
  onLearn,
  onClose,
}: PayeeMenuProps) {
  const {t} = useTranslation();
  const [learnCategories = 'true'] = useSyncedPref('learn-categories');
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';

  // Transfer accounts are never editable
  const isDisabled = [...selectedPayees].some(
    id => payeesById[id] == null || payeesById[id].transfer_acct,
  );

  const selectedPayeeNames = [...selectedPayees]
    .slice(0, 4)
    .map(id => payeesById[id].name)
    .join(', ');

  const items: MenuItem[] = [
    {
      icon: SvgDelete,
      name: 'delete',
      text: t('Delete'),
      disabled: isDisabled,
    },
    {
      icon: SvgBookmark,
      iconSize: 9,
      name: 'favorite',
      text: t('Favorite'),
      disabled: isDisabled,
    },
    {
      icon: SvgMerge,
      iconSize: 9,
      name: 'merge',
      text: t('Merge'),
      disabled: isDisabled || selectedPayees.size < 2,
    },
  ];

  if (isLearnCategoriesEnabled) {
    items.push({
      icon: SvgLightBulb,
      iconSize: 9,
      name: 'learn',
      text: t('Category Learning'),
      disabled: isDisabled,
    });
  }

  items.push(Menu.line);

  return (
    <Menu
      onMenuSelect={type => {
        onClose();
        switch (type) {
          case 'delete':
            onDelete();
            break;
          case 'merge':
            void onMerge();
            break;
          case 'favorite':
            onFavorite();
            break;
          case 'learn':
            onLearn();
            break;
          default:
        }
      }}
      footer={
        <View
          style={{
            padding: 3,
            fontSize: 11,
            fontStyle: 'italic',
            color: theme.pageTextSubdued,
          }}
        >
          {selectedPayees.size > 4 ? (
            <Trans>{{selectedPayeeNames}}, and more</Trans>
          ) : (
            selectedPayeeNames
          )}
        </View>
      }
      items={items}
    />
  );
}
