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
import {useTranslation} from 'react-i18next';

import {useResponsive} from '@actual-app/components/hooks/useResponsive';
import {theme} from '@actual-app/components/theme';

import {PayeeAutocomplete} from '#components/autocomplete/PayeeAutocomplete';
import {Modal, ModalCloseButton, ModalHeader, ModalTitle} from '#components/common/Modal';
import {useAccounts} from '#hooks/useAccounts';
import {useNavigate} from '#hooks/useNavigate';
import {usePayees} from '#hooks/usePayees';
import type {Modal as ModalType} from '#modals/modalsSlice';

type PayeeAutocompleteModalProps = Extract<ModalType, {name: 'payee-autocomplete'}>['options'];

export function PayeeAutocompleteModal({onSelect, onClose}: PayeeAutocompleteModalProps) {
  const {t} = useTranslation();
  const {data: payees = []} = usePayees();
  const {data: accounts = []} = useAccounts();
  const navigate = useNavigate();

  const {isNarrowWidth} = useResponsive();
  const defaultAutocompleteProps = {
    containerProps: {style: {height: isNarrowWidth ? '90vh' : 275}},
  };

  const onManagePayees = () => navigate('/payees');

  return (
    <Modal
      name="payee-autocomplete"
      noAnimation={!isNarrowWidth}
      onClose={onClose}
      containerProps={{
        style: {
          height: isNarrowWidth ? 'calc(var(--visual-viewport-height) * 0.85)' : 275,
          backgroundColor: theme.menuAutoCompleteBackground,
        },
      }}
    >
      {({state}) => (
        <>
          {isNarrowWidth && (
            <ModalHeader
              title={
                <ModalTitle
                  title={t('Payee')}
                  getStyle={() => ({color: theme.menuAutoCompleteText})}
                />
              }
              rightContent={
                <ModalCloseButton
                  onPress={() => state.close()}
                  style={{color: theme.menuAutoCompleteText}}
                />
              }
            />
          )}
          <PayeeAutocomplete
            payees={payees}
            accounts={accounts}
            focused
            embedded
            closeOnBlur={false}
            onClose={() => state.close()}
            onManagePayees={onManagePayees}
            showManagePayees={!isNarrowWidth}
            showMakeTransfer={!isNarrowWidth}
            {...defaultAutocompleteProps}
            onSelect={onSelect}
            value={null}
          />
        </>
      )}
    </Modal>
  );
}
