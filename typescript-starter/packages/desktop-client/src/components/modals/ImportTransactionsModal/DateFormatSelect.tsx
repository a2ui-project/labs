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
import { useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { View } from '@actual-app/components/view';

import { SectionLabel } from '#components/forms';

import { dateFormats } from './utils';
import type { DateFormat, FieldMapping, ImportTransaction } from './utils';

type DateFormatSelectProps = {
  transactions: ImportTransaction[];
  fieldMappings?: FieldMapping;
  parseDateFormat?: DateFormat;
  onChange: (newValue: string) => void;
};

export function DateFormatSelect({
  transactions,
  fieldMappings,
  parseDateFormat,
  onChange,
}: DateFormatSelectProps) {
  const { t } = useTranslation();
  // We don't actually care about the delimiter, but we try to render
  // it based on the data we have so far. Look in a transaction and
  // try to figure out what delimiter the date is using, and default
  // to space if we can't figure it out.
  let delimiter = '-';
  if (transactions.length > 0 && fieldMappings && fieldMappings.date != null) {
    const date = transactions[0][fieldMappings.date];
    const m = date && String(date).match(/[/.,\-/\\]/);
    delimiter = m ? m[0] : ' ';
  }

  return (
    <View style={{ width: 120 }}>
      <SectionLabel title={t('Date format')} />
      <Select
        options={dateFormats.map(f => [
          f.format,
          f.label.replace(/ /g, delimiter),
        ])}
        value={parseDateFormat || ''}
        onChange={onChange}
      />
    </View>
  );
}
