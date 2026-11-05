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

import {MAX_FORMATTABLE_AMOUNT} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import {useFormat} from '#hooks/useFormat';
import {usePrivacyMode} from '#hooks/usePrivacyMode';

/**
 * Y-axis tick formatter shared by the Monte Carlo charts: redacted in
 * privacy mode, otherwise the amount without decimals. Recharts can
 * synthesize ticks beyond the (already clamped) data extremes, so ticks
 * are kept within what the formatter accepts.
 */
export function useMonteCarloTickFormatter() {
  const privacyMode = usePrivacyMode();
  const format = useFormat();

  return (tick: number) => {
    if (privacyMode) {
      return '...';
    }
    const safeTick = Math.min(
      Math.max(Math.round(tick), -MAX_FORMATTABLE_AMOUNT),
      MAX_FORMATTABLE_AMOUNT,
    );
    return `${format(safeTick, 'financial-no-decimals')}`;
  };
}
