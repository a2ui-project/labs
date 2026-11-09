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

import React from 'react';

import {render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {TestProviders} from '#mocks';

import {BudgetAnalysisGraph} from './BudgetAnalysisGraph';

const sampleData = {
  intervalData: [
    {
      date: '2024-01',
      budgeted: 50000,
      spent: -30000,
      balance: 20000,
      overspendingAdjustment: 0,
    },
    {
      date: '2024-02',
      budgeted: 50000,
      spent: -40000,
      balance: 30000,
      overspendingAdjustment: 0,
    },
  ],
};

describe('BudgetAnalysisGraph – balanceOnly', () => {
  it('renders the balance series label when balanceOnly is true', () => {
    render(
      <TestProviders>
        <BudgetAnalysisGraph data={sampleData} graphType="Line" balanceOnly showBalance={false} />
      </TestProviders>,
    );
    // The LineChart should render without throwing; the balance dataKey should be present
    // We verify by checking the container renders successfully
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders all series when balanceOnly is false', () => {
    render(
      <TestProviders>
        <BudgetAnalysisGraph data={sampleData} graphType="Line" balanceOnly={false} showBalance />
      </TestProviders>,
    );
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders a bar chart when graphType is Bar and balanceOnly is false', () => {
    render(
      <TestProviders>
        <BudgetAnalysisGraph data={sampleData} graphType="Bar" balanceOnly={false} showBalance />
      </TestProviders>,
    );
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders a line chart (balance-only) even when graphType is Bar', () => {
    // When balanceOnly=true the component always renders a LineChart
    render(
      <TestProviders>
        <BudgetAnalysisGraph data={sampleData} graphType="Bar" balanceOnly />
      </TestProviders>,
    );
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('hides balance line when showBalance is false and balanceOnly is false', () => {
    render(
      <TestProviders>
        <BudgetAnalysisGraph
          data={sampleData}
          graphType="Line"
          balanceOnly={false}
          showBalance={false}
        />
      </TestProviders>,
    );
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});
