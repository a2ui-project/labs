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

import { describe, expect, it } from 'vitest';

import { getNextVersion } from './get-next-package-version';

describe('getNextVersion (lib)', () => {
  it('hotfix increments patch', () => {
    expect(
      getNextVersion({
        currentVersion: '25.8.1',
        type: 'hotfix',
        currentDate: new Date('2025-08-10'),
      }),
    ).toBe('25.8.2');
  });

  it('monthly advances month same year', () => {
    expect(
      getNextVersion({
        currentVersion: '25.8.3',
        type: 'monthly',
        currentDate: new Date('2025-08-15'),
      }),
    ).toBe('25.9.0');
  });

  it('monthly wraps year December -> January', () => {
    expect(
      getNextVersion({
        currentVersion: '25.12.3',
        type: 'monthly',
        currentDate: new Date('2025-12-05'),
      }),
    ).toBe('26.1.0');
  });

  it('nightly format with date stamp', () => {
    expect(
      getNextVersion({
        currentVersion: '25.8.1',
        type: 'nightly',
        currentDate: new Date('2025-08-22'),
      }),
    ).toBe('25.9.0-nightly.20250822');
  });

  it('auto before 25th -> hotfix', () => {
    expect(
      getNextVersion({
        currentVersion: '25.8.4',
        type: 'auto',
        currentDate: new Date('2025-08-20'),
      }),
    ).toBe('25.8.5');
  });

  it('auto after 25th (same month) -> monthly', () => {
    expect(
      getNextVersion({
        currentVersion: '25.8.4',
        type: 'auto',
        currentDate: new Date('2025-08-27'),
      }),
    ).toBe('25.9.0');
  });

  it('auto after 25th (next month) -> monthly', () => {
    expect(
      getNextVersion({
        currentVersion: '25.8.4',
        type: 'auto',
        currentDate: new Date('2025-09-02'),
      }),
    ).toBe('25.9.0');
  });

  it('invalid type throws', () => {
    expect(() =>
      getNextVersion({
        currentVersion: '25.8.4',
        type: 'unknown' as never,
        currentDate: new Date('2025-08-10'),
      }),
    ).toThrow(/Invalid type/);
  });
});
