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

// @ts-strict-ignore
import React from 'react';
import type { SVGAttributes } from 'react';

import { theme } from '@actual-app/components/theme';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';

export const renderCustomLabel = (
  calcX: SVGAttributes<SVGTextElement>['x'],
  calcY: SVGAttributes<SVGTextElement>['y'],
  textAnchor: SVGAttributes<SVGTextElement>['textAnchor'],
  display: string,
  textSize?: SVGAttributes<SVGTextElement>['fontSize'],
  showLabel?: number,
  showLabelThreshold?: number,
  fill: SVGAttributes<SVGTextElement>['fill'] = theme.pageText,
) => {
  return !showLabel || Math.abs(showLabel) > showLabelThreshold ? (
    <FinancialText
      as="text"
      key={fill + display}
      x={calcX}
      y={calcY}
      fill={fill}
      textAnchor={textAnchor}
      dominantBaseline="middle"
      fontSize={textSize}
    >
      <PrivacyFilter>{display}</PrivacyFilter>
    </FinancialText>
  ) : (
    <text />
  );
};
