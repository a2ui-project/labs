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

import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Label } from '@actual-app/components/label';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as asyncStorage from '@actual-app/core/platform/server/asyncStorage';
import type { OpenIdConfig } from '@actual-app/core/types/models';

import { closeBudget } from '#budgetfiles/budgetfilesSlice';
import { Error } from '#components/alerts';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { OpenIdForm } from '#components/manager/subscribe/OpenIdForm';
import { useRefreshLoginMethods } from '#components/ServerContext';
import { popModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import { getOpenIdErrors } from '#util/error';

type OpenIDEnableModalProps = Extract<
  ModalType,
  { name: 'enable-openid' }
>['options'];

export function OpenIDEnableModal({
  onSave: originalOnSave,
}: OpenIDEnableModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [error, setError] = useState('');
  const refreshLoginMethods = useRefreshLoginMethods();

  async function onSave(config: OpenIdConfig) {
    try {
      const { error } = (await send('enable-openid', { openId: config })) || {};
      if (!error) {
        originalOnSave?.();
        try {
          await refreshLoginMethods();
          await asyncStorage.removeItem('user-token');
          await dispatch(closeBudget());
        } catch (e) {
          console.error('Failed to cleanup after OpenID enable:', e);
          setError(
            t(
              'OpenID was enabled but cleanup failed. Please refresh the application.',
            ),
          );
        }
      } else {
        setError(getOpenIdErrors(error));
      }
    } catch (e) {
      console.error('Failed to enable OpenID:', e);
      setError(t('Failed to enable OpenID. Please try again.'));
    }
  }

  return (
    <Modal name="enable-openid">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Enable OpenID')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />

          <View style={{ flexDirection: 'column' }}>
            <OpenIdForm
              onSetOpenId={onSave}
              otherButtons={[
                <Button
                  key="cancel"
                  variant="bare"
                  style={{ marginRight: 10 }}
                  onPress={() => dispatch(popModal())}
                >
                  <Trans>Cancel</Trans>
                </Button>,
              ]}
            />
            <Label
              style={{
                ...styles.verySmallText,
                color: theme.pageTextLight,
                paddingTop: 5,
              }}
              title={t('After enabling OpenID all sessions will be closed')}
            />
            <Label
              style={{
                ...styles.verySmallText,
                color: theme.pageTextLight,
              }}
              title={t('The first user to login will become the server owner')}
            />
            <Label
              style={{
                ...styles.verySmallText,
                color: theme.warningText,
              }}
              title={t('The current password will be disabled')}
            />

            {error && <Error>{error}</Error>}
          </View>
        </>
      )}
    </Modal>
  );
}
