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

import {Menu} from '@actual-app/components/menu';
import {describe, expect, it} from 'vitest';

import {getDashboardWidgetItems} from './getDashboardWidgetItems';

function getNames(items: ReturnType<typeof getDashboardWidgetItems>) {
  return items.filter(item => item !== Menu.line).map(item => item.name);
}

describe('getDashboardWidgetItems', () => {
  it('includes the balance forecast card only when the flag is enabled', () => {
    const disabled = getDashboardWidgetItems({
      t: value => value,
      customReports: [],
      formulaMode: false,
      crossoverReportEnabled: false,
      budgetAnalysisReportEnabled: false,
      balanceForecastReportEnabled: false,
    });

    const enabled = getDashboardWidgetItems({
      t: value => value,
      customReports: [],
      formulaMode: false,
      crossoverReportEnabled: false,
      budgetAnalysisReportEnabled: false,
      balanceForecastReportEnabled: true,
    });

    expect(getNames(disabled)).not.toContain('balance-forecast-card');
    expect(getNames(enabled)).toContain('balance-forecast-card');
  });

  it('keeps custom report entries after a divider', () => {
    const items = getDashboardWidgetItems({
      t: value => value,
      customReports: [{id: 'abc', name: 'Custom Budget Review'}],
      formulaMode: false,
      crossoverReportEnabled: false,
      budgetAnalysisReportEnabled: false,
      balanceForecastReportEnabled: false,
    });

    expect(items).toContain(Menu.line);
    expect(getNames(items)).toContain('custom-report-abc');
  });
});
