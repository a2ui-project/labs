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

import React, { lazy, Suspense } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

const FormulaEditor = lazy(() =>
  import('#components/formula/FormulaEditor').then(module => ({
    default: module.FormulaEditor,
  })),
);

type FormulaActionEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function FormulaActionEditor({
  value,
  onChange,
  disabled = false,
}: FormulaActionEditorProps) {
  // Enforce single-line: replace newlines with spaces
  const handleChange = (newValue: string) => {
    const singleLineValue = newValue.replace(/[\r\n]+/g, ' ');
    onChange(singleLineValue);
  };

  return (
    <View
      style={{
        flex: 1,
        border: `1px solid ${theme.formInputBorder}`,
        borderRadius: 4,
        overflow: 'visible',
        backgroundColor: disabled
          ? theme.formInputBackgroundSelection
          : theme.tableBackground,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Suspense fallback={<div style={{ height: 32 }} />}>
        <FormulaEditor
          value={value}
          onChange={handleChange}
          mode="transaction"
          disabled={disabled}
          singleLine
          showLineNumbers={false}
        />
      </Suspense>
    </View>
  );
}
