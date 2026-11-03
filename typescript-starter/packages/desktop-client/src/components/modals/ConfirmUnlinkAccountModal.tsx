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
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Paragraph } from '@actual-app/components/paragraph';
import { View } from '@actual-app/components/view';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import type { Modal as ModalType } from '#modals/modalsSlice';

type ConfirmUnlinkAccountModalProps = Extract<
  ModalType,
  { name: 'confirm-unlink-account' }
>['options'];

export function ConfirmUnlinkAccountModal({
  accountName,
  isViewBankSyncSettings,
  onUnlink,
}: ConfirmUnlinkAccountModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      name="confirm-unlink-account"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Confirm Unlink')} // Use translation for title
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            <Paragraph>
              <Trans>
                Are you sure you want to unlink <strong>{accountName}</strong>?
              </Trans>
            </Paragraph>

            <Paragraph>
              {isViewBankSyncSettings
                ? t(
                    'Transactions will no longer be synchronized with this account and must be manually entered. You will not be able to edit the bank sync settings for this account and the settings will close.',
                  )
                : t(
                    'Transactions will no longer be synchronized with this account and must be manually entered.',
                  )}
            </Paragraph>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}
            >
              <Button style={{ marginRight: 10 }} onPress={() => state.close()}>
                <Trans>Cancel</Trans>
              </Button>
              <InitialFocus>
                <Button
                  variant="primary"
                  onPress={() => {
                    onUnlink();
                    state.close();
                  }}
                >
                  <Trans>Unlink</Trans>
                </Button>
              </InitialFocus>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
