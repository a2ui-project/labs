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
import type { CSSProperties } from 'react';

import { Select } from '@actual-app/components/select';

type SelectFieldProps = {
  style?: CSSProperties;
  options: string[];
  value: null | string;
  onChange: (newValue: string) => void;
  hasHeaderRow: boolean;
  firstTransaction: Record<string, unknown>;
};

export function SelectField({
  style,
  options,
  value,
  onChange,
  hasHeaderRow,
  firstTransaction,
}: SelectFieldProps) {
  const columns = options.map(
    option =>
      [
        option,
        hasHeaderRow
          ? option
          : `Column ${parseInt(option) + 1} (${String(firstTransaction[option])})`,
      ] as const,
  );

  // If selected column does not exist in transaction sheet, ignore
  if (!columns.find(col => col[0] === value)) value = null;

  return (
    <Select
      options={[['choose-field', 'Choose field...'], ...columns]}
      value={value === null ? 'choose-field' : value}
      onChange={onChange}
      style={style}
    />
  );
}
