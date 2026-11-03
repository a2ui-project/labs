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

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { LegendItem } from './LegendItem';
import { ReportOptions } from './ReportOptions';

type ReportLegendProps = {
  legend?: Array<{ name: string; color: string }>;
  groupBy: string;
  interval: string;
};

export function ReportLegend({ legend, groupBy, interval }: ReportLegendProps) {
  return (
    <View
      style={{
        backgroundColor: theme.pageBackground,
        alignItems: 'center',
        flex: 1,
        overflowY: 'auto',
      }}
    >
      <Text
        style={{
          ...styles.largeText,
          alignItems: 'center',
          marginBottom: 2,
          fontWeight: 400,
          paddingTop: 10,
        }}
      >
        {groupBy === 'Interval'
          ? ReportOptions.intervalMap.get(interval)
          : groupBy}
      </Text>
      <View>
        {legend &&
          legend.map(item => {
            return (
              <LegendItem
                key={item.name}
                color={item.color}
                label={item.name}
              />
            );
          })}
      </View>
    </View>
  );
}
