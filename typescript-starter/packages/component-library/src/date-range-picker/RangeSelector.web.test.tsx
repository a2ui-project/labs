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

import { render, screen } from '@testing-library/react';

import { RangeSelector } from './RangeSelector';

const defaultProps = {
  min: '2020-01',
  max: '2030-12',
  locale: 'en-US',
  labels: { previous: 'Previous', next: 'Next' },
  onChange: () => {},
};

describe('RangeSelector', () => {
  it('jumps the shown year to a range set from outside it', () => {
    const { rerender } = render(
      <RangeSelector {...defaultProps} start="2025-01" end="2025-06" />,
    );
    expect(screen.getByText('2025')).toBeTruthy();

    // e.g. a quick-select preset picks a range in another year
    rerender(<RangeSelector {...defaultProps} start="2026-05" end="2026-07" />);
    expect(screen.getByText('2026')).toBeTruthy();
  });

  it('keeps the shown year when it already touches the new range', () => {
    const { rerender } = render(
      <RangeSelector {...defaultProps} start="2025-01" end="2025-06" />,
    );
    rerender(<RangeSelector {...defaultProps} start="2024-05" end="2025-03" />);
    expect(screen.getByText('2025')).toBeTruthy();
  });
});
