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

import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useRechartsAnimation } from '#components/reports/chart-theme';
import { Container } from '#components/reports/Container';
import { MonteCarloHistogramTooltip } from '#components/reports/graphs/MonteCarloHistogramTooltip';

type MonteCarloHistogramProps = {
  style?: CSSProperties;
  depletionHistogram: Array<{ year: number; count: number }>;
  /** The user's current age; the x-axis shows the failure year's age */
  startAge: number;
  medianDepletionYear: number | null;
  simulationCount: number;
  showTooltip?: boolean;
};

export function MonteCarloHistogram({
  style,
  depletionHistogram,
  startAge,
  medianDepletionYear,
  simulationCount,
  showTooltip = true,
}: MonteCarloHistogramProps) {
  const animationProps = useRechartsAnimation({ animationDuration: 1000 });

  const data = depletionHistogram.map(entry => ({
    ...entry,
    // The age of the year that couldn't be funded, matching the drill-in
    age: startAge + entry.year - 1,
  }));

  return (
    <Container style={style}>
      {(width, height) => (
        <BarChart
          width={width}
          height={height}
          data={data}
          margin={{ top: 15, right: 0, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="age"
            tick={{ fill: theme.pageText }}
            tickLine={{ stroke: theme.pageText }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: theme.pageText }}
            tickLine={{ stroke: theme.pageText }}
          />
          {showTooltip && (
            <Tooltip
              content={
                <MonteCarloHistogramTooltip simulationCount={simulationCount} />
              }
              isAnimationActive={false}
              cursor={{ fill: 'transparent' }}
            />
          )}
          {medianDepletionYear != null && (
            <ReferenceLine
              x={startAge + medianDepletionYear - 1}
              stroke={theme.noticeText}
              strokeDasharray="4 4"
            />
          )}
          <Bar
            dataKey="count"
            fill={theme.reportsNumberNegative}
            {...animationProps}
          />
        </BarChart>
      )}
    </Container>
  );
}
