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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';
import type { IntegerAmount } from '@actual-app/core/shared/util';

import {
  addToBeBudgetedGroup,
  removeCategoriesFromGroups,
} from '#components/budget/util';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { FieldLabel, TapField } from '#components/mobile/MobileForms';
import { AmountInput } from '#components/util/AmountInput';
import { useCategories } from '#hooks/useCategories';
import { useInitialMount } from '#hooks/useInitialMount';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type CoverModalProps = Extract<ModalType, { name: 'cover' }>['options'];

export function CoverModal({
  title,
  amount: initialAmount,
  categoryId,
  month,
  showToBeBudgeted = true,
  onSubmit,
}: CoverModalProps) {
  const { t } = useTranslation();
  const [hideFraction] = useSyncedPref('hideFraction');

  const { data: { grouped: originalCategoryGroups } = { grouped: [] } } =
    useCategories();
  const [categoryGroups, categories] = useMemo(() => {
    const expenseGroups = originalCategoryGroups.filter(g => !g.is_income);
    const categoryGroups = showToBeBudgeted
      ? addToBeBudgetedGroup(expenseGroups)
      : expenseGroups;
    const filteredCategoryGroups = categoryId
      ? removeCategoriesFromGroups(categoryGroups, categoryId)
      : categoryGroups;
    const filteredCategoryies = filteredCategoryGroups.flatMap(
      g => g.categories || [],
    );
    return [filteredCategoryGroups, filteredCategoryies];
  }, [categoryId, originalCategoryGroups, showToBeBudgeted]);

  const [fromCategoryId, setFromCategoryId] = useState<string | null>(null);
  const dispatch = useDispatch();

  const openCategoryModal = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'category-autocomplete',
          options: {
            categoryGroups,
            month,
            onSelect: categoryId => {
              setFromCategoryId(categoryId);
            },
          },
        },
      }),
    );
  }, [categoryGroups, dispatch, month]);

  const fromCategory = categories.find(c => c.id === fromCategoryId);
  const [amount, setAmount] = useState<IntegerAmount>(
    Math.abs(initialAmount ?? 0),
  );

  const _onSubmit = () => {
    if (amount && fromCategoryId) {
      onSubmit(amount, fromCategoryId);
    }
  };

  const isInitialMount = useInitialMount();
  useEffect(() => {
    if (isInitialMount) {
      openCategoryModal();
    }
  }, [isInitialMount, openCategoryModal]);

  return (
    <Modal name="cover">
      {({ state }) => (
        <>
          <ModalHeader
            title={title}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View>
            <FieldLabel title={t('Cover this amount:')} />
            <InitialFocus>
              <AmountInput
                value={amount}
                autoDecimals={String(hideFraction) !== 'true'}
                style={{
                  marginLeft: styles.mobileEditingPadding,
                  marginRight: styles.mobileEditingPadding,
                }}
                inputStyle={{
                  height: styles.mobileMinHeight,
                }}
                onUpdate={setAmount}
                onEnter={() => {
                  if (!fromCategoryId) {
                    openCategoryModal();
                  }
                }}
              />
            </InitialFocus>
          </View>

          <View>
            <FieldLabel title={t('From:')} />
            <TapField value={fromCategory?.name} onPress={openCategoryModal} />
          </View>

          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: 10,
            }}
          >
            <Button
              variant="primary"
              style={{
                height: styles.mobileMinHeight,
                marginLeft: styles.mobileEditingPadding,
                marginRight: styles.mobileEditingPadding,
              }}
              onPress={() => {
                _onSubmit();
                state.close();
              }}
            >
              <Trans>Transfer</Trans>
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
