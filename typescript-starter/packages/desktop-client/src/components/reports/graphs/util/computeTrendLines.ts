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

import type { DataEntity, LegendEntity } from '@actual-app/core/types/models';

export type TrendLineSegment = {
  id: string;
  color: string;
  start: { x: string; y: number };
  end: { x: string; y: number };
};

export function computeTrendLines(
  intervalData: DataEntity['intervalData'],
  legend: LegendEntity[],
): TrendLineSegment[] {
  const n = intervalData.length;
  if (n < 2) return [];

  const sumX = sumRange(n);
  const denom = n * sumSquares(n) - sumX ** 2;
  if (denom === 0) return [];

  const rows = intervalData as unknown as ReadonlyArray<
    Record<string, number | undefined>
  >;

  return legend.map(entry => {
    let sumY = 0;
    let sumXY = 0;
    for (let x = 0; x < n; x++) {
      const y = rows[x][entry.dataKey] ?? 0;
      sumY += y;
      sumXY += x * y;
    }
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return {
      id: entry.id ?? entry.dataKey,
      color: entry.color,
      start: { x: intervalData[0].date, y: intercept },
      end: { x: intervalData[n - 1].date, y: intercept + slope * (n - 1) },
    };
  });
}

function sumRange(n: number) {
  return (n * (n - 1)) / 2;
}

function sumSquares(n: number) {
  return ((n - 1) * n * (2 * n - 1)) / 6;
}
