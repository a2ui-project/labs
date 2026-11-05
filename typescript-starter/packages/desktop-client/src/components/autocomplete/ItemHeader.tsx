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
import type {CSSProperties} from 'react';

import {useResponsive} from '@actual-app/components/hooks/useResponsive';
import {styles} from '@actual-app/components/styles';
import {theme} from '@actual-app/components/theme';

type ItemHeaderProps = {
  title: string;
  style?: CSSProperties;
  type?: string;
};

export function ItemHeader({title, style, type, ...props}: ItemHeaderProps) {
  const {isNarrowWidth} = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        ...styles.largeText,
        paddingTop: 10,
        paddingBottom: 10,
      }
    : {};

  return (
    <div
      style={{
        color: theme.menuAutoCompleteTextHeader,
        padding: '4px 9px',
        ...narrowStyle,
        ...style,
      }}
      data-testid={`${title}-${type}-item-group`}
      {...props}
    >
      {title}
    </div>
  );
}
