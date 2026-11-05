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
import {Trans} from 'react-i18next';

import {Text} from '@actual-app/components/text';
import {theme} from '@actual-app/components/theme';

import {formatDate, parseDate} from './utils';

type ParsedDateProps = {
  parseDateFormat?: Parameters<typeof parseDate>[1];
  dateFormat: Parameters<typeof parseDate>[1];
  date?: string;
};

export function ParsedDate({parseDateFormat, dateFormat, date}: ParsedDateProps) {
  const parsed =
    date && formatDate(parseDateFormat ? parseDate(date, parseDateFormat) : date, dateFormat);
  return (
    <Text>
      <Text>
        {date || (
          <Text style={{color: theme.pageTextLight, fontStyle: 'italic'}}>
            <Trans>Empty</Trans>
          </Text>
        )}{' '}
        &rarr;{' '}
      </Text>
      <Text style={{color: parsed ? theme.noticeTextLight : theme.errorText}}>
        {parsed || <Trans>Invalid</Trans>}
      </Text>
    </Text>
  );
}
