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
import { useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { send } from '@actual-app/core/platform/client/connection';
import type { PayeeEntity } from '@actual-app/core/types/models';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { DisplayId } from '#components/util/DisplayId';
import { useFormatList } from '#hooks/useFormatList';
import { popModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

export function PostsOfflineNotification() {
  const { t, i18n } = useTranslation();

  const location = useLocation();
  const dispatch = useDispatch();

  const locationState = location.state;
  const payees =
    locationState && 'payees' in locationState
      ? (locationState.payees as Array<PayeeEntity['id']>)
      : [];

  async function onPost() {
    await send('schedule/force-run-service');
    dispatch(popModal());
  }

  const payeesList = payees.map(id => (
    <Text key={id} style={{ color: theme.pageTextPositive }}>
      <DisplayId id={id} type="payees" />
    </Text>
  ));
  const payeeNamesList = useFormatList(payeesList, i18n.language);

  return (
    <Modal name="schedule-posts-offline-notification">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Post transactions?')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <Paragraph>
            <Text>
              {payees.length > 0 ? (
                <Trans count={payees.length}>
                  The payees <span>{payeeNamesList}</span> have schedules that
                  are due today.
                </Trans>
              ) : (
                t('There are payees that have schedules that are due today.', {
                  count: payees.length,
                })
              )}{' '}
              <Trans>
                Usually we automatically post transactions for these, but you
                are offline or syncing failed. In order to avoid duplicate
                transactions, we let you choose whether or not to create
                transactions for these schedules.
              </Trans>
            </Text>
          </Paragraph>
          <Paragraph>
            <Trans>
              Be aware that other devices may have already created these
              transactions. If you have multiple devices, make sure you only do
              this on one device or you will have duplicate transactions.
            </Trans>
          </Paragraph>
          <Paragraph>
            <Trans>
              You can always manually post a transaction later for a due
              schedule by selecting the schedule and clicking "Post transaction
              today" in the action menu.
            </Trans>
          </Paragraph>
          <SpaceBetween
            gap={10}
            style={{ marginTop: 20, justifyContent: 'flex-end' }}
          >
            <Button onPress={() => state.close()}>
              <Trans>Decide later</Trans>
            </Button>
            <Button
              variant="primary"
              autoFocus
              onPress={() => {
                void onPost();
                state.close();
              }}
            >
              <Trans>Post transactions</Trans>
            </Button>
          </SpaceBetween>
        </>
      )}
    </Modal>
  );
}
