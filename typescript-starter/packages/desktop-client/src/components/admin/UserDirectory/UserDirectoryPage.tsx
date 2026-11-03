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
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { View } from '@actual-app/components/view';

import { Page } from '#components/Page';
import { useNavigate } from '#hooks/useNavigate';

import { UserDirectory } from './UserDirectory';

export function UserDirectoryPage({
  bottomContent,
}: {
  bottomContent?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Page
      header={t('User Directory')}
      style={{
        borderRadius: '5px',
        marginBottom: '25px',
      }}
    >
      <UserDirectory isModal={false} />
      <View
        style={{
          flexGrow: 1,
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          marginBottom: 15,
        }}
      >
        {bottomContent}
      </View>
    </Page>
  );
}

export function BackToFileListButton() {
  const navigate = useNavigate();

  return (
    <Button style={{ maxWidth: '200px' }} onPress={() => navigate('/')}>
      <Trans>Back to file list</Trans>
    </Button>
  );
}
