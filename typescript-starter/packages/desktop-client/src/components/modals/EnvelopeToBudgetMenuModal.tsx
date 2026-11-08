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
import type {CSSProperties} from 'react';

import {styles} from '@actual-app/components/styles';
import {theme} from '@actual-app/components/theme';

import {ToBudgetMenu} from '#components/budget/envelope/budgetsummary/ToBudgetMenu';
import {Modal, ModalCloseButton, ModalHeader} from '#components/common/Modal';
import type {Modal as ModalType} from '#modals/modalsSlice';

type EnvelopeToBudgetMenuModalProps = Extract<
  ModalType,
  {name: 'envelope-summary-to-budget-menu'}
>['options'];

export function EnvelopeToBudgetMenuModal({
  onTransfer,
  onCover,
  onHoldBuffer,
  onResetHoldBuffer,
  onBudgetAction,
  month,
}: EnvelopeToBudgetMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  return (
    <Modal name="envelope-summary-to-budget-menu">
      {({state}) => (
        <>
          <ModalHeader showLogo rightContent={<ModalCloseButton onPress={() => state.close()} />} />
          <ToBudgetMenu
            getItemStyle={() => defaultMenuItemStyle}
            onTransfer={onTransfer}
            onCover={onCover}
            onHoldBuffer={onHoldBuffer}
            onResetHoldBuffer={onResetHoldBuffer}
            onBudgetAction={onBudgetAction}
            month={month}
          />
        </>
      )}
    </Modal>
  );
}
