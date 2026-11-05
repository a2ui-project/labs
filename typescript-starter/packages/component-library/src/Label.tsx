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

import {forwardRef} from 'react';
import type {CSSProperties, ReactNode} from 'react';

import {styles} from './styles';
import {Text} from './Text';
import {theme} from './theme';

type LabelProps = {
  title: ReactNode;
  style?: CSSProperties;
};

export const Label = forwardRef<HTMLSpanElement, LabelProps>(({title, style}: LabelProps, ref) => {
  return (
    <Text
      ref={ref}
      style={{
        ...styles.text,
        color: theme.tableRowHeaderText,
        textAlign: 'right',
        fontSize: 14,
        marginBottom: 2,
        ...style,
      }}
    >
      {title}
    </Text>
  );
});

Label.displayName = 'Label';
