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
import type {CSSProperties, ReactNode} from 'react';

import {View} from '@actual-app/components/view';
import type {GroupedEntity} from '@actual-app/core/types/models';

import type {renderRowProps} from './ReportTable';

type RenderTableRowProps = {
  index: number;
  parent_index?: number;
  renderRow: (arg: renderRowProps) => ReactNode;
  mode: string;
  metadata: GroupedEntity[];
  style?: CSSProperties;
};

export function RenderTableRow({
  index,
  parent_index,
  renderRow,
  mode,
  metadata,
  style,
}: RenderTableRowProps) {
  const child = metadata[index];
  const parent = parent_index !== undefined ? metadata[parent_index] : ({} as GroupedEntity);

  const item =
    parent_index === undefined
      ? child
      : (parent.categories && parent.categories[index]) || ({} as GroupedEntity);

  return (
    <View>
      {renderRow({
        item,
        mode,
        style,
      })}
    </View>
  );
}
