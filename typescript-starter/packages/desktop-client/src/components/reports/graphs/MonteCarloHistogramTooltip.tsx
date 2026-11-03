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

import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

type PayloadItem = {
  payload: {
    year: number;
    age: number;
    count: number;
  };
};

type MonteCarloHistogramTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  simulationCount: number;
};

export function MonteCarloHistogramTooltip({
  active,
  payload,
  simulationCount,
}: MonteCarloHistogramTooltipProps) {
  const { t } = useTranslation();

  if (active && payload && payload.length) {
    const point = payload[0].payload;
    return (
      <div
        className={css({
          zIndex: 1000,
          pointerEvents: 'none',
          borderRadius: 2,
          boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
          backgroundColor: theme.menuBackground,
          color: theme.menuItemText,
          padding: 10,
        })}
      >
        {t(
          '{{failedCount}} of {{total}} scenarios ran out of money at age {{age}}',
          {
            failedCount: point.count,
            total: simulationCount,
            age: point.age,
          },
        )}
      </div>
    );
  }
  return null;
}
