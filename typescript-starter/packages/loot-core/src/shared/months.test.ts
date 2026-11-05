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

import * as monthUtils from './months';

test('range returns a full range', () => {
  expect(monthUtils.range('2016-10', '2018-01')).toMatchSnapshot();
});

test('getQuarter returns the quarter number for a given month', () => {
  expect(monthUtils.getQuarter('2024-01')).toBe(1);
  expect(monthUtils.getQuarter('2024-03')).toBe(1);
  expect(monthUtils.getQuarter('2024-04')).toBe(2);
  expect(monthUtils.getQuarter('2024-06')).toBe(2);
  expect(monthUtils.getQuarter('2024-07')).toBe(3);
  expect(monthUtils.getQuarter('2024-09')).toBe(3);
  expect(monthUtils.getQuarter('2024-10')).toBe(4);
  expect(monthUtils.getQuarter('2024-12')).toBe(4);
});

test('getQuarterStart and getQuarterEnd return the bounding months of the quarter', () => {
  expect(monthUtils.getQuarterStart('2024-02')).toBe('2024-01');
  expect(monthUtils.getQuarterEnd('2024-02')).toBe('2024-03');
  expect(monthUtils.getQuarterStart('2024-11')).toBe('2024-10');
  expect(monthUtils.getQuarterEnd('2024-11')).toBe('2024-12');
});

test('prevQuarter subtracts three months, landing in the previous quarter', () => {
  expect(monthUtils.prevQuarter('2024-02')).toBe('2023-11');
  expect(monthUtils.prevQuarter('2024-01')).toBe('2023-10');
  expect(monthUtils.prevQuarter('2024-04')).toBe('2024-01');
});

test('isValidYearMonthDay validates the day against the month and year', () => {
  expect(monthUtils.isValidYearMonthDay('2024-02-29')).toBe(true);
  expect(monthUtils.isValidYearMonthDay('2023-02-29')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-04-31')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-12-31')).toBe(true);
  expect(monthUtils.isValidYearMonthDay('2024-00-10')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-13-10')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-02-00')).toBe(false);
  expect(monthUtils.isValidYearMonthDay('2024-02')).toBe(false);
});
