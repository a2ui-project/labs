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

import {Link} from '#components/common/Link';
import {Modal, ModalCloseButton, ModalHeader} from '#components/common/Modal';
import {useSyncedPref} from '#hooks/useSyncedPref';

export function CategoryLearning() {
  const {t} = useTranslation();
  const [learnCategories = 'true', setLearnCategories] = useSyncedPref('learn-categories');
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';

  return (
    <Modal name="payee-category-learning" containerProps={{style: {width: 600}}}>
      {({state}) => (
        <>
          <ModalHeader
            title={t('Category Learning')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <Paragraph>
            <Trans>
              <strong>Category Learning</strong> will automatically determine the best category for
              a transaction and create a rule that sets the category for the payee.{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/budgeting/rules/#automatic-rules"
                linkColor="purple"
              >
                Learn more
              </Link>
            </Trans>
          </Paragraph>
          <Paragraph>
            <Trans>
              Disabling Category Learning will not delete any existing rules but will prevent new
              rules from being created automatically on a global level.
            </Trans>
          </Paragraph>
          <Button
            onPress={() => setLearnCategories(String(!isLearnCategoriesEnabled))}
            variant={isLearnCategoriesEnabled ? 'normal' : 'primary'}
          >
            {isLearnCategoriesEnabled ? (
              <Trans>Disable category learning</Trans>
            ) : (
              <Trans>Enable category learning</Trans>
            )}
          </Button>
        </>
      )}
    </Modal>
  );
}
