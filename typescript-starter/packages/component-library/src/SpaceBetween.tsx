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
import type {ReactNode} from 'react';

import type {CSSProperties} from './styles';
import {View} from './View';

type SpaceBetweenProps = {
  direction?: 'horizontal' | 'vertical';
  gap?: number;
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch';
  style?: CSSProperties;
  children: ReactNode;
};

export const SpaceBetween = ({
  direction = 'horizontal',
  gap = 15,
  wrap = true,
  align = 'center',
  style,
  children,
  ...props
}: SpaceBetweenProps) => {
  return (
    <View
      style={{
        flexWrap: wrap ? 'wrap' : 'nowrap',
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
        alignItems: align,
        gap,
        ...style,
      }}
      {...props}
    >
      {children}
    </View>
  );
};
