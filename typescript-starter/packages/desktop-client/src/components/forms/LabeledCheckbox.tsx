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
import type {ComponentProps, CSSProperties, ReactNode} from 'react';

import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';

import {Checkbox} from './index';

type LabeledCheckboxProps = {
  id: string;
  checked?: ComponentProps<typeof Checkbox>['checked'];
  disabled?: ComponentProps<typeof Checkbox>['disabled'];
  onChange?: ComponentProps<typeof Checkbox>['onChange'];
  onMouseDown?: ComponentProps<typeof View>['onMouseDown'];
  children: ReactNode;
  style?: CSSProperties;
};

export function LabeledCheckbox({
  id,
  checked,
  disabled,
  onChange,
  onMouseDown,
  children,
  style,
}: LabeledCheckboxProps) {
  return (
    <View
      onMouseDown={onMouseDown}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none',
        minHeight: 28,
        ...style,
      }}
    >
      <Checkbox id={id} checked={checked} disabled={disabled} onChange={onChange} />
      <label
        htmlFor={id}
        style={{
          userSelect: 'none',
          color: disabled ? theme.pageTextSubdued : undefined,
        }}
      >
        {children}
      </label>
    </View>
  );
}
