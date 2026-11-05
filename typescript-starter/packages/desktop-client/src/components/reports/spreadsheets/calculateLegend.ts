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

import {theme} from '@actual-app/components/theme';
import type {
  balanceTypeOpType,
  GroupedEntity,
  IntervalEntity,
  LegendEntity,
} from '@actual-app/core/types/models';

import {getColorScale} from '#components/reports/chart-theme';

export function calculateLegend(
  intervalData: IntervalEntity[],
  calcDataFiltered: GroupedEntity[],
  groupBy: string,
  graphType?: string,
  balanceTypeOp?: balanceTypeOpType,
): LegendEntity[] {
  const colorScale = getColorScale('qualitative');
  const chooseData =
    groupBy === 'Interval'
      ? intervalData.map(c => {
          return {name: c.date, id: null, data: c};
        })
      : calcDataFiltered.map(c => {
          return {name: c.name, id: c.id, data: c};
        });

  function getColor(data: IntervalEntity | GroupedEntity, index: number) {
    if (graphType === 'DonutGraph') {
      return colorScale[index % colorScale.length];
    }

    if (groupBy === 'Interval') {
      if (balanceTypeOp === 'totalDebts') {
        return theme.reportsNumberNegative;
      }

      if (balanceTypeOp === 'netDebts') {
        return theme.reportsNumberNegative;
      }

      if (balanceTypeOp === 'totalTotals' || balanceTypeOp === 'totalBudgeted') {
        const total = balanceTypeOp === 'totalBudgeted' ? data.totalBudgeted : data.totalTotals;

        if (total < 0) {
          return theme.reportsNumberNegative;
        }

        return theme.reportsNumberPositive;
      }

      if (balanceTypeOp === 'totalAssets' || balanceTypeOp === 'netAssets') {
        return theme.reportsNumberPositive;
      }

      return theme.reportsChartFill;
    }

    return colorScale[index % colorScale.length];
  }

  const legend: LegendEntity[] = chooseData.map((item, index) => {
    return {
      id: item.id || '',
      name: item.name || '',
      color: getColor(item.data, index),
      dataKey: item.id || item.name || '', // Use id for unique data lookup
      uncategorizedId: 'uncategorizedId' in item.data ? item.data.uncategorizedId : undefined,
    };
  });
  return legend;
}
