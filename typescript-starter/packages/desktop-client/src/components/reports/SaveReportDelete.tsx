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
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

type SaveReportDeleteProps = {
  onDelete: () => void;
  onClose: () => void;
  name: string;
};

export function SaveReportDelete({
  onDelete,
  onClose,
  name,
}: SaveReportDeleteProps) {
  return (
    <>
      <View style={{ align: 'center' }}>
        <Text style={{ color: theme.errorText, marginBottom: 5 }}>
          <Trans>
            Are you sure you want to delete the report named{" '"}
            <Text style={{ display: 'inline' }}>
              {{ name } as TransObjectLiteral}
            </Text>
            '?
          </Trans>
        </Text>
      </View>

      <SpaceBetween
        style={{
          marginTop: 15,
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }} />
        <Button variant="primary" autoFocus onPress={onDelete}>
          <Trans>Yes</Trans>
        </Button>
        <Button variant="primary" onPress={onClose}>
          <Trans>No</Trans>
        </Button>
      </SpaceBetween>
    </>
  );
}
