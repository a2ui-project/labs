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

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { friendlyOp, mapField } from '#util/rule';

import { Value } from './Value';

const valueStyle = {
  color: theme.pillTextHighlighted,
};

type ConditionExpressionProps = {
  field: unknown;
  op: unknown;
  value: unknown;
  options: unknown;
  prefix?: string;
  style?: CSSProperties;
  inline?: boolean;
};

export function ConditionExpression({
  field,
  op,
  value,
  options,
  prefix,
  style,
  inline,
}: ConditionExpressionProps) {
  return (
    <View
      style={{
        display: 'block',
        maxWidth: '100%',
        color: theme.pillText,
        backgroundColor: theme.pillBackgroundLight,
        borderRadius: 4,
        padding: '3px 5px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...style,
      }}
    >
      {prefix && <Text>{prefix} </Text>}
      <Text style={valueStyle}>{mapField(field, options)}</Text>{' '}
      <Text>{friendlyOp(op)}</Text>{' '}
      {!['onbudget', 'offbudget'].includes(
        (op as string)?.toLocaleLowerCase(),
      ) && (
        <Value style={valueStyle} value={value} field={field} inline={inline} />
      )}
    </View>
  );
}
