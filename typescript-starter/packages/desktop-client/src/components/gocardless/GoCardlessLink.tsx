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

import { Paragraph } from '@actual-app/components/paragraph';
import { View } from '@actual-app/components/view';

import { Modal, ModalHeader } from '#components/common/Modal';

export function GoCardlessLink() {
  const { t } = useTranslation();

  window.close();
  return (
    <Modal name="gocardless-link" isDismissable={false}>
      <ModalHeader title={t('Account sync')} />
      <View style={{ maxWidth: 500 }}>
        <Paragraph>
          <Trans>Please wait...</Trans>
        </Paragraph>
        <Paragraph>
          <Trans>
            The window should close automatically. If nothing happened you can
            close this window or tab.
          </Trans>
        </Paragraph>
      </View>
    </Modal>
  );
}
