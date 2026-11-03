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

import { SvgRefresh } from '@actual-app/components/icons/v1';
import { View } from '@actual-app/components/view';
import { keyframes } from '@emotion/css';

const spin = keyframes({
  '0%': { transform: 'rotateZ(0deg)' },
  '100%': { transform: 'rotateZ(360deg)' },
});

type AnimatedRefreshProps = {
  animating: boolean;
  iconStyle?: CSSProperties;
  width?: number;
  height?: number;
};

export function AnimatedRefresh({
  animating,
  iconStyle,
  width,
  height,
}: AnimatedRefreshProps) {
  return (
    <View
      style={{
        animation: animating ? `${spin} 1s infinite linear` : undefined,
      }}
    >
      <SvgRefresh
        width={width ? width : 14}
        height={height ? height : 14}
        style={iconStyle}
      />
    </View>
  );
}
