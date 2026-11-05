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

import type {DataEntity, LegendEntity} from '@actual-app/core/types/models';

import {computeTrendLines} from './computeTrendLines';

function point(date: string, values: Record<string, number>) {
  return {
    date,
    totalAssets: 0,
    totalDebts: 0,
    netAssets: 0,
    netDebts: 0,
    totalTotals: 0,
    totalBudgeted: 0,
    ...values,
  } satisfies DataEntity['intervalData'][number];
}

const series = (overrides: Partial<LegendEntity> = {}): LegendEntity => ({
  name: 'A',
  id: 'a',
  color: '#000',
  dataKey: 'a',
  ...overrides,
});

describe('computeTrendLines', () => {
  it('returns an empty list when there are fewer than two intervals', () => {
    expect(computeTrendLines([], [series()])).toEqual([]);
    expect(computeTrendLines([point('Jan', {a: 1})], [series()])).toEqual([]);
  });

  it('fits a perfect line for a perfectly linear series', () => {
    const result = computeTrendLines(
      [point('Jan', {a: 0}), point('Feb', {a: 10}), point('Mar', {a: 20}), point('Apr', {a: 30})],
      [series()],
    );

    expect(result).toEqual([
      {
        id: 'a',
        color: '#000',
        start: {x: 'Jan', y: 0},
        end: {x: 'Apr', y: 30},
      },
    ]);
  });

  it('produces a flat line at the mean for a constant series', () => {
    const result = computeTrendLines(
      [point('Jan', {a: 5}), point('Feb', {a: 5}), point('Mar', {a: 5})],
      [series()],
    );

    expect(result[0].start.y).toBeCloseTo(5);
    expect(result[0].end.y).toBeCloseTo(5);
  });

  it('falls back to zero when a series has missing values', () => {
    const result = computeTrendLines(
      [point('Jan', {}), point('Feb', {}), point('Mar', {})],
      [series()],
    );

    expect(result[0].start.y).toBeCloseTo(0);
    expect(result[0].end.y).toBeCloseTo(0);
  });

  it('falls back to the dataKey when a series has no id', () => {
    const [line] = computeTrendLines(
      [point('Jan', {a: 1}), point('Feb', {a: 2})],
      [series({id: null})],
    );

    expect(line.id).toBe('a');
  });

  it('computes a separate trend for each series', () => {
    const result = computeTrendLines(
      [point('Jan', {a: 0, b: 100}), point('Feb', {a: 10, b: 80}), point('Mar', {a: 20, b: 60})],
      [series({id: 'a', dataKey: 'a', color: '#a'}), series({id: 'b', dataKey: 'b', color: '#b'})],
    );

    expect(result).toHaveLength(2);
    expect(result[0].end.y).toBeCloseTo(20);
    expect(result[1].end.y).toBeCloseTo(60);
  });
});
