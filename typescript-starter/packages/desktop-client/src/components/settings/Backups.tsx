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

import { Text } from '@actual-app/components/text';

import { Setting } from './UI';

export function Backups() {
  const BACKUP_FREQUENCY_MINS = 15;
  const MAX_BACKUPS = 10;

  return (
    <Setting>
      <Text>
        <strong>
          <Trans>Backups</Trans>
        </strong>
        <p>
          <Trans>
            Backups are taken every {{ BACKUP_FREQUENCY_MINS }} minutes and
            stored in{' '}
            <strong>
              <i>Actual's data directory</i>
            </strong>
            . Actual retains a maximum of {{ MAX_BACKUPS }} backups at any time.
          </Trans>
        </p>
      </Text>
    </Setting>
  );
}
