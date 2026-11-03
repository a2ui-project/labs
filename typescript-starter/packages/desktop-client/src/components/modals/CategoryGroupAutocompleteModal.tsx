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
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { CategoryGroupAutocomplete } from '#components/autocomplete/CategoryGroupAutocomplete';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { SectionLabel } from '#components/forms';
import { SheetNameProvider } from '#hooks/useSheetName';
import type { Modal as ModalType } from '#modals/modalsSlice';

type CategoryGroupAutocompleteModalProps = Extract<
  ModalType,
  { name: 'category-group-autocomplete' }
>['options'];

export function CategoryGroupAutocompleteModal({
  title,
  month,
  onSelect,
  categoryGroups,
  showHiddenCategories,
  closeOnSelect,
  clearOnSelect,
  onClose,
}: CategoryGroupAutocompleteModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const defaultAutocompleteProps = {
    containerProps: { style: { height: isNarrowWidth ? '90vh' : 275 } },
  };

  return (
    <Modal
      name="category-group-autocomplete"
      noAnimation={!isNarrowWidth}
      onClose={onClose}
      containerProps={{
        style: {
          height: isNarrowWidth
            ? 'calc(var(--visual-viewport-height) * 0.85)'
            : 275,
          backgroundColor: theme.menuAutoCompleteBackground,
        },
      }}
    >
      {({ state }) => (
        <>
          {isNarrowWidth && (
            <ModalHeader
              title={
                <ModalTitle
                  title={title || t('Category group')}
                  getStyle={() => ({ color: theme.menuAutoCompleteText })}
                />
              }
              rightContent={
                <ModalCloseButton
                  onPress={() => state.close()}
                  style={{ color: theme.menuAutoCompleteText }}
                />
              }
            />
          )}
          <View>
            {!isNarrowWidth && (
              <SectionLabel
                title={t('Category group')}
                style={{
                  alignSelf: 'center',
                  color: theme.menuAutoCompleteText,
                  marginBottom: 10,
                }}
              />
            )}
            <View style={{ flex: 1 }}>
              <SheetNameProvider
                name={month ? monthUtils.sheetForMonth(month) : ''}
              >
                <CategoryGroupAutocomplete
                  focused
                  embedded
                  closeOnBlur={false}
                  closeOnSelect={closeOnSelect}
                  clearOnSelect={clearOnSelect}
                  onClose={() => state.close()}
                  {...defaultAutocompleteProps}
                  onSelect={onSelect}
                  categoryGroups={categoryGroups}
                  showHiddenCategories={showHiddenCategories}
                  value={null}
                />
              </SheetNameProvider>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
