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

import React, { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AutoSizer } from 'react-virtualized-auto-sizer';

import { View } from '@actual-app/components/view';

type ContainerProps = {
  style?: CSSProperties;
  children: (
    width: number,
    height: number,
    host: HTMLDivElement | null,
  ) => ReactNode;
};
export function Container({ style, children }: ContainerProps) {
  const portalHost = useRef<HTMLDivElement>(null);

  return (
    <View
      style={{ height: 300, position: 'relative', flexShrink: 0, ...style }}
    >
      <div ref={portalHost} />
      <AutoSizer
        renderProp={({ width = 0, height = 0 }) => {
          if (width === 0 || height === 0) {
            return null;
          }

          return (
            <div style={{ width, height }}>
              {children(width, height, portalHost.current)}
            </div>
          );
        }}
      />
    </View>
  );
}
