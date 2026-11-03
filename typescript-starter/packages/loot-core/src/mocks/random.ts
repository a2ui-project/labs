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

import * as Platform from '#shared/platform';

// Fake "random" function used to have stable data structures for
// e2e and visual regression tests
let pseudoRandomIterator = 0;
function pseudoRandom(): number {
  pseudoRandomIterator += 0.45;

  if (pseudoRandomIterator > 1) {
    pseudoRandomIterator = 0;
  }

  return pseudoRandomIterator;
}

export const random = Platform.isPlaywright ? pseudoRandom : Math.random;
