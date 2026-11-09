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
import type {ComponentPropsWithoutRef, ElementType} from 'react';

import {styles} from '@actual-app/components/styles';
import type {CSSProperties} from '@actual-app/components/styles';
import {Text} from '@actual-app/components/text';

type FinancialTextProps<T extends ElementType = typeof Text> = {
  as?: T;
  style?: CSSProperties;
} & Omit<ComponentPropsWithoutRef<T>, 'style' | 'as'>;

export function FinancialText<T extends ElementType = typeof Text>({
  as,
  style,
  ...props
}: FinancialTextProps<T>) {
  const Component = as ?? Text;

  return <Component {...props} style={{...style, ...styles.tnum}} />;
}
