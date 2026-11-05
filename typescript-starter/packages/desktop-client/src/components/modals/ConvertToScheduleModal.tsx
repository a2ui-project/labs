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
import {Trans, useTranslation} from 'react-i18next';

import {Block} from '@actual-app/components/block';
import {Button} from '@actual-app/components/button';
import {useResponsive} from '@actual-app/components/hooks/useResponsive';
import {InitialFocus} from '@actual-app/components/initial-focus';
import {styles} from '@actual-app/components/styles';
import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';

import {Modal, ModalCloseButton, ModalHeader} from '#components/common/Modal';
import type {Modal as ModalType} from '#modals/modalsSlice';

type ConvertToScheduleModalProps = Extract<ModalType, {name: 'convert-to-schedule'}>['options'];

export function ConvertToScheduleModal({
  onCancel,
  onConfirm,
  daysUntilTransaction,
  upcomingDays,
}: ConvertToScheduleModalProps) {
  const {t} = useTranslation();

  const {isNarrowWidth} = useResponsive();
  const narrowButtonStyle = isNarrowWidth
    ? {
        height: styles.mobileMinHeight,
      }
    : {};

  return (
    <Modal name="convert-to-schedule" containerProps={{style: {width: '30vw'}}}>
      {({state}) => (
        <>
          <ModalHeader
            title={t('Convert to Schedule')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{lineHeight: 1.5}}>
            <Block
              style={{
                marginTop: 10,
                padding: 10,
                backgroundColor: theme.warningBackground,
                borderRadius: 4,
              }}
            >
              <Trans count={daysUntilTransaction}>
                <strong>Warning:</strong> This transaction is {{count: daysUntilTransaction}} days
                away,
              </Trans>{' '}
              <Trans count={upcomingDays}>
                which is beyond your configured upcoming length of {{count: upcomingDays}} days. The
                schedule preview will not be visible in your account until it gets closer to the
                date.
              </Trans>
            </Block>
            <View
              style={{
                marginTop: 20,
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                aria-label={t('Cancel')}
                style={{
                  marginRight: 10,
                  ...narrowButtonStyle,
                  ...(isNarrowWidth && {flex: 1}),
                }}
                onPress={() => {
                  state.close();
                  onCancel?.();
                }}
              >
                <Trans>Cancel</Trans>
              </Button>
              <InitialFocus>
                <Button
                  aria-label={t('Convert to Schedule')}
                  variant="primary"
                  style={{
                    ...narrowButtonStyle,
                    ...(isNarrowWidth && {flex: 1}),
                  }}
                  onPress={() => {
                    state.close();
                    onConfirm();
                  }}
                >
                  <Trans>Create schedule anyway</Trans>
                </Button>
              </InitialFocus>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
