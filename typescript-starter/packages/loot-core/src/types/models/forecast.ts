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

export type ForecastSource = 'schedules' | 'tracking-budget';

export type ForecastDataPoint = {
  date: string;
  balance: number;
  accountId: string;
  accountName: string;
  transactions: ForecastTransaction[];
};

export type ForecastTransaction = {
  amount: number;
  payee: string | null;
  scheduleId: string;
  scheduleName: string;
};

export type BalanceForecastConfig = {
  id: string;
  name: string;
  forecastMonths: number;
  selectedAccounts: string[];
  showCombined: boolean;
  showIndividual: boolean;
  source?: ForecastSource;
  tombstone?: boolean;
};

export type ForecastResult = {
  dataPoints: ForecastDataPoint[];
  lowestBalance: {
    date: string;
    balance: number;
    accountId: string;
    accountName: string;
  };
  forecastStartDate: string;
  forecastEndDate: string;
};
