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

import { theme } from '@actual-app/components/theme';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '#mocks';

import { Change } from './Change';

describe('Change', () => {
  it('renders a positive amount with a plus sign and positive color', () => {
    render(
      <TestProviders>
        <Change amount={12345} />
      </TestProviders>,
    );
    const el = screen.getByText('+123.45');
    expect(el).toBeInTheDocument();
    expect(getComputedStyle(el).color).toBe(theme.reportsNumberPositive);
  });

  it('renders zero with a plus sign and neutral color', () => {
    render(
      <TestProviders>
        <Change amount={0} />
      </TestProviders>,
    );
    const el = screen.getByText('+0.00');
    expect(el).toBeInTheDocument();
    expect(getComputedStyle(el).color).toBe(theme.reportsNumberNeutral);
  });

  it('renders a negative amount with a minus sign and negative color', () => {
    render(
      <TestProviders>
        <Change amount={-9876} />
      </TestProviders>,
    );
    const el = screen.getByText('-98.76');
    expect(el).toBeInTheDocument();
    expect(getComputedStyle(el).color).toBe(theme.reportsNumberNegative);
  });

  it('merges custom style prop', () => {
    render(
      <TestProviders>
        <Change amount={1000} style={{ fontWeight: 'bold' }} />
      </TestProviders>,
    );
    const el = screen.getByText('+10.00');
    const computed = getComputedStyle(el);
    expect(computed.color).toBe(theme.reportsNumberPositive);
    expect(computed.fontWeight).toBe('bold');
  });
});
