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

import React, {useEffect, useState} from 'react';
import {Trans, useTranslation} from 'react-i18next';

import {Button} from '@actual-app/components/button';
import {InitialFocus} from '@actual-app/components/initial-focus';
import {styles} from '@actual-app/components/styles';
import {View} from '@actual-app/components/view';

import {useEnvelopeSheetValue} from '#components/budget/envelope/EnvelopeBudgetComponents';
import {Modal, ModalCloseButton, ModalHeader} from '#components/common/Modal';
import {FieldLabel} from '#components/mobile/MobileForms';
import {AmountInput} from '#components/util/AmountInput';
import {useSyncedPref} from '#hooks/useSyncedPref';
import type {Modal as ModalType} from '#modals/modalsSlice';
import {envelopeBudget} from '#spreadsheet/bindings';

type HoldBufferModalProps = Extract<ModalType, {name: 'hold-buffer'}>['options'];

export function HoldBufferModal({onSubmit}: HoldBufferModalProps) {
  const {t} = useTranslation(); // Initialize i18next
  const [hideFraction] = useSyncedPref('hideFraction');
  const available = useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0;
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    setAmount(available);
  }, [available]);

  const _onSubmit = (newAmount: number) => {
    if (newAmount) {
      onSubmit?.(newAmount);
    }
  };

  return (
    <Modal name="hold-buffer">
      {({state}) => (
        <>
          <ModalHeader
            title={t('Hold for next month')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View>
            <FieldLabel title={t('Hold this amount:')} />{' '}
            <InitialFocus>
              <AmountInput
                value={amount}
                autoDecimals={String(hideFraction) !== 'true'}
                zeroSign="+"
                style={{
                  marginLeft: styles.mobileEditingPadding,
                  marginRight: styles.mobileEditingPadding,
                }}
                inputStyle={{
                  height: styles.mobileMinHeight,
                }}
                onUpdate={setAmount}
                onEnter={() => {
                  _onSubmit(amount);
                  state.close();
                }}
              />
            </InitialFocus>
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
              onPress={() => _onSubmit(amount)}
            >
              <Trans>Hold</Trans>
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
