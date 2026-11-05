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

import {send} from '@actual-app/core/platform/client/connection';
import type {RuleConditionEntity} from '@actual-app/core/types/models';
import type {ForecastResult, ForecastSource} from '@actual-app/core/types/models/forecast';
import {keepPreviousData, useQuery} from '@tanstack/react-query';

type UseBalanceForecastParams = {
  accountIds?: string[];
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  startDate: string;
  endDate: string;
  includeAccountlessSchedules?: boolean;
  source?: ForecastSource;
  enabled?: boolean;
};

export function buildBalanceForecastRequest({
  accountIds,
  conditions,
  conditionsOp,
  startDate,
  endDate,
  includeAccountlessSchedules,
  source = 'schedules',
}: UseBalanceForecastParams) {
  return Object.fromEntries(
    Object.entries({
      accountIds,
      conditions,
      conditionsOp,
      startDate,
      endDate,
      includeAccountlessSchedules,
      source,
    }).filter(([, value]) => value !== undefined),
  );
}

export function useBalanceForecast({
  accountIds,
  conditions,
  conditionsOp,
  startDate,
  endDate,
  includeAccountlessSchedules,
  source = 'schedules',
  enabled = true,
}: UseBalanceForecastParams) {
  return useQuery({
    queryKey: [
      'balance-forecast',
      {
        accountIds: accountIds ?? null,
        conditions: conditions ?? null,
        conditionsOp: conditionsOp ?? 'and',
        startDate,
        endDate,
        includeAccountlessSchedules: includeAccountlessSchedules ?? false,
        source,
      },
    ],
    queryFn: async (): Promise<ForecastResult> =>
      send(
        'forecast/generate',
        buildBalanceForecastRequest({
          accountIds,
          conditions,
          conditionsOp,
          startDate,
          endDate,
          includeAccountlessSchedules,
          source,
        }),
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
}
