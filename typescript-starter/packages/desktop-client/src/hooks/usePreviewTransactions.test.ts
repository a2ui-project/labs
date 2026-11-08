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

import {describe, expect, test} from 'vitest';

import {comparePreviewTransactions} from './usePreviewTransactions';

describe('comparePreviewTransactions', () => {
  test('sorts by date descending first', () => {
    const a = {date: '2024-01-01', amount: 100, sort_order: 0};
    const b = {date: '2024-01-05', amount: 100, sort_order: 0};
    expect(comparePreviewTransactions(a, b)).toBeGreaterThan(0);
    expect(comparePreviewTransactions(b, a)).toBeLessThan(0);
  });

  test('same date: sorts by sort_order descending', () => {
    const a = {date: '2024-01-01', amount: 100, sort_order: 5};
    const b = {date: '2024-01-01', amount: 100, sort_order: 10};
    expect(comparePreviewTransactions(a, b)).toBeGreaterThan(0);
    expect(comparePreviewTransactions(b, a)).toBeLessThan(0);
  });

  test('same date, null/equal sort_order: falls back to amount ascending', () => {
    const a = {date: '2024-01-01', amount: 200, sort_order: null};
    const b = {date: '2024-01-01', amount: 100, sort_order: null};
    expect(comparePreviewTransactions(a, b)).toBeGreaterThan(0);
    expect(comparePreviewTransactions(b, a)).toBeLessThan(0);
  });

  test('same date, one sort_order undefined treated as 0', () => {
    const a = {date: '2024-01-01', amount: 100, sort_order: undefined};
    const b = {date: '2024-01-01', amount: 999, sort_order: 5};
    // b has higher sort_order (5 > 0), so b sorts first regardless of amount
    expect(comparePreviewTransactions(a, b)).toBeGreaterThan(0);
  });
});
