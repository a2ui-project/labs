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

import { useMemo } from 'react';

import type { MonteCarloConfig } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { useAccountBalances } from '#hooks/useAccountBalances';

/**
 * Resolves account-linked pots to their live balances: a linked pot takes
 * the account's current balance, falling back to its stored starting
 * balance until the live value arrives. Shared by the report page and the
 * dashboard card so both simulate the same portfolio.
 */
export function useResolvedMonteCarloConfig(
  config: MonteCarloConfig,
): MonteCarloConfig {
  const accountBalances = useAccountBalances(
    config.pots
      .map(pot => pot.accountId)
      .filter((id): id is string => id != null),
  );

  // Memoized by hand: this plain .ts file sits outside the React
  // Compiler's include (.tsx only), and the compiled consumers key their
  // auto-memoized simulation runs on this object's identity - a fresh
  // object every render would re-simulate on every unrelated re-render
  return useMemo(
    () => ({
      ...config,
      pots: config.pots.map(pot => {
        const balance =
          pot.accountId != null ? accountBalances[pot.accountId] : null;
        return balance != null
          ? { ...pot, startingBalance: Math.max(0, balance) }
          : pot;
      }),
    }),
    [config, accountBalances],
  );
}
