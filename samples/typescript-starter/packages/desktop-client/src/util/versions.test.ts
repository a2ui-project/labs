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

import {describe, expect, it} from 'vitest';

import {cmpSemanticVersion} from './versions';

describe('cmpSemanticVersion', () => {
  it('compares major, minor and patch numerically', () => {
    expect(cmpSemanticVersion('26.8.1', '26.8.1')).toBe(0);
    expect(cmpSemanticVersion('26.8.0', '26.8.1')).toBeLessThan(0);
    expect(cmpSemanticVersion('26.10.0', '26.9.9')).toBeGreaterThan(0);
    expect(cmpSemanticVersion('27.0.0', '26.12.5')).toBeGreaterThan(0);
  });

  it('ignores a leading "v"', () => {
    expect(cmpSemanticVersion('v26.8.1', '26.8.1')).toBe(0);
  });
});
