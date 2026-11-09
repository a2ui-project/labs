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

import type {ComponentProps, CSSProperties, ReactNode} from 'react';

import {Block} from './Block';
import {View} from './View';

type AlignedTextProps = ComponentProps<typeof View> & {
  left: ReactNode;
  right: ReactNode;
  style?: CSSProperties;
  leftStyle?: CSSProperties;
  rightStyle?: CSSProperties;
  truncate?: 'left' | 'right';
};
export function AlignedText({
  left,
  right,
  style,
  leftStyle,
  rightStyle,
  truncate = 'left',
  ...nativeProps
}: AlignedTextProps) {
  const truncateStyle: CSSProperties = {
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };

  return (
    <View style={{flexDirection: 'row', alignItems: 'center', ...style}} {...nativeProps}>
      <Block
        style={{
          marginRight: 10,
          ...(truncate === 'left' && truncateStyle),
          ...leftStyle,
        }}
      >
        {left}
      </Block>
      <Block
        style={{
          flex: 1,
          textAlign: 'right',
          ...(truncate === 'right' && truncateStyle),
          ...rightStyle,
        }}
      >
        {right}
      </Block>
    </View>
  );
}
