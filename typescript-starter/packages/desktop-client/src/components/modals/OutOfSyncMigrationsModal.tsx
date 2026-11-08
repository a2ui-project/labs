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

import {Button} from '@actual-app/components/button';
import {Paragraph} from '@actual-app/components/paragraph';
import {Text} from '@actual-app/components/text';
import {View} from '@actual-app/components/view';

import {closeBudget} from '#budgetfiles/budgetfilesSlice';
import {Link} from '#components/common/Link';
import {Modal, ModalHeader, ModalTitle} from '#components/common/Modal';
import {useDispatch} from '#redux';

export function OutOfSyncMigrationsModal() {
  const dispatch = useDispatch();

  const {t} = useTranslation();

  const closeBudgetAndModal = (close: () => void) => {
    void dispatch(closeBudget());
    close();
  };

  return (
    <Modal name="out-of-sync-migrations">
      {({state}) => (
        <>
          <ModalHeader title={<ModalTitle title={t('Please update Actual!')} />} />
          <View
            style={{
              padding: 15,
              gap: 15,
              paddingTop: 0,
              paddingBottom: 25,
              maxWidth: 550,
              lineHeight: '1.5em',
            }}
          >
            <Text>
              <Paragraph style={{fontSize: 16}}>
                <Trans>
                  It looks like you&apos;re using an outdated version of the Actual client. Your
                  budget data has been updated by another client, but this client is still on the
                  old version. For the best experience, please update Actual to the latest version.
                </Trans>
              </Paragraph>
            </Text>

            <Paragraph
              style={{
                fontSize: 16,
              }}
            >
              <Trans>
                If you can&apos;t update Actual at this time you can find the latest release at{' '}
                <Link variant="external" to="https://app.actualbudget.org">
                  app.actualbudget.org
                </Link>
                . You can use it until your client is updated.
              </Trans>
            </Paragraph>

            <View
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
            >
              <Button
                variant="primary"
                style={{
                  padding: '10px 30px',
                }}
                onPress={() => closeBudgetAndModal(() => state.close())}
              >
                <Trans>Close Budget</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
