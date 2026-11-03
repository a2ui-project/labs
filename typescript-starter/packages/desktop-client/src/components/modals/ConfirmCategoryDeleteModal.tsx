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
import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next'; // Import useTranslation

import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { CategoryAutocomplete } from '#components/autocomplete/CategoryAutocomplete';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { useCategories } from '#hooks/useCategories';
import type { Modal as ModalType } from '#modals/modalsSlice';

type ConfirmCategoryDeleteModalProps = Extract<
  ModalType,
  { name: 'confirm-category-delete' }
>['options'];

export function ConfirmCategoryDeleteModal({
  group: groupId,
  category: categoryId,
  onDelete,
}: ConfirmCategoryDeleteModalProps) {
  const { t } = useTranslation(); // Initialize translation hook
  const [transferCategory, setTransferCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    data: { grouped: categoryGroups, list: categories } = {
      grouped: [],
      list: [],
    },
  } = useCategories();
  const group = categoryGroups.find(g => g.id === groupId);
  const category = categories.find(c => c.id === categoryId);

  const renderError = (error: string) => {
    let msg: string;

    switch (error) {
      case 'required-transfer':
        msg = 'You must select a category';
        break;
      default:
        msg = 'Something bad happened, sorry!';
    }

    return (
      <Text
        style={{
          marginTop: 15,
          color: theme.errorText,
        }}
      >
        {msg}
      </Text>
    );
  };

  const isIncome = !!(category || group).is_income;

  return (
    <Modal
      name="confirm-category-delete"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Confirm Delete')} // Use translation for title
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            {group ? (
              <Block>
                {!isIncome ? (
                  <Trans>
                    Categories in the group{' '}
                    <strong>
                      {{ group: group.name } as TransObjectLiteral}
                    </strong>{' '}
                    are used by existing transactions.
                  </Trans>
                ) : (
                  <Trans>
                    Categories in the group{' '}
                    <strong>
                      {{ group: group.name } as TransObjectLiteral}
                    </strong>{' '}
                    are used by existing transactions or it has a positive
                    leftover balance currently.
                  </Trans>
                )}
                <Trans>
                  <strong>Are you sure you want to delete it?</strong> If so,
                  you must select another category to transfer existing
                  transactions and balance to.
                </Trans>
              </Block>
            ) : (
              <Block>
                {!isIncome ? (
                  <Trans>
                    <strong>
                      {{ category: category.name } as TransObjectLiteral}
                    </strong>{' '}
                    is used by existing transactions.
                  </Trans>
                ) : (
                  <Trans>
                    <strong>
                      {{ category: category.name } as TransObjectLiteral}
                    </strong>{' '}
                    is used by existing transactions or it has a positive
                    leftover balance currently.
                  </Trans>
                )}
                <Trans>
                  <strong>Are you sure you want to delete it?</strong> If so,
                  you must select another category to transfer existing
                  transactions and balance to.
                </Trans>
              </Block>
            )}

            {error && renderError(error)}

            <View
              style={{
                marginTop: 20,
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'center',
              }}
            >
              <Text>
                <Trans>Transfer to:</Trans>
              </Text>

              <View style={{ flex: 1, marginLeft: 10, marginRight: 30 }}>
                <CategoryAutocomplete
                  categoryGroups={
                    group
                      ? categoryGroups.filter(
                          g => g.id !== group.id && !!g.is_income === isIncome,
                        )
                      : categoryGroups
                          .filter(g => !!g.is_income === isIncome)
                          .map(g => ({
                            ...g,
                            categories: g.categories.filter(
                              c => c.id !== category.id,
                            ),
                          }))
                  }
                  value={transferCategory}
                  focused
                  inputProps={{
                    placeholder: t('Select category...'),
                  }}
                  onSelect={category => setTransferCategory(category)}
                  showHiddenCategories
                />
              </View>

              <Button
                variant="primary"
                onPress={() => {
                  if (!transferCategory) {
                    setError('required-transfer');
                  } else {
                    onDelete(transferCategory);
                    state.close();
                  }
                }}
              >
                <Trans>Delete</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
