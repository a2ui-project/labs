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

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { MonteCarloCashflowSwatch } from '#components/reports/graphs/MonteCarloCashflowSwatch';
import type { MonteCarloCashflowSeries } from '#components/reports/graphs/util/monteCarloCashflowChart';
import { GROUP_HEADING_STYLE } from '#components/reports/reports/monte-carlo/monteCarloStyles';

type MonteCarloCashflowLegendGroupProps = {
  heading: string;
  series: MonteCarloCashflowSeries[];
};

/** One heading + swatch-row group of the cashflow chart's legend */
export function MonteCarloCashflowLegendGroup({
  heading,
  series,
}: MonteCarloCashflowLegendGroupProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={GROUP_HEADING_STYLE}>{heading}</Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: 15,
          rowGap: 4,
        }}
      >
        {series.map(entry => (
          <View
            key={entry.key}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <MonteCarloCashflowSwatch color={entry.color} size={12} />
            <Text>{entry.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
