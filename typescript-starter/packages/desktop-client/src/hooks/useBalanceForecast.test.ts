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

import {describe, expect, it} from 'vitest';

import {buildBalanceForecastRequest} from './useBalanceForecast';

describe('buildBalanceForecastRequest', () => {
  it('keeps schedule forecast filters and account selection', () => {
    expect(
      buildBalanceForecastRequest({
        accountIds: ['acct'],
        conditions: [{field: 'account', op: 'is', value: 'acct'}],
        conditionsOp: 'and',
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        includeAccountlessSchedules: true,
        source: 'schedules',
      }),
    ).toEqual({
      accountIds: ['acct'],
      conditions: [{field: 'account', op: 'is', value: 'acct'}],
      conditionsOp: 'and',
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      includeAccountlessSchedules: true,
      source: 'schedules',
    });
  });

  it('omits tracking budget filters and account selection when undefined', () => {
    expect(
      buildBalanceForecastRequest({
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        source: 'tracking-budget',
      }),
    ).toEqual({
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      source: 'tracking-budget',
    });
  });

  it('defaults to schedules when source is omitted', () => {
    expect(
      buildBalanceForecastRequest({
        startDate: '2024-03-01',
        endDate: '2024-03-31',
      }),
    ).toEqual({
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      source: 'schedules',
    });
  });
});
