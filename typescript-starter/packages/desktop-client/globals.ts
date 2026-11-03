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

import '@playwright/test';

// Allow images to be imported
declare module '*.png';

declare global {
  function __resetWorld(): void;

  // oxlint-disable-next-line typescript/no-namespace
  namespace PlaywrightTest {
    // oxlint-disable-next-line typescript/consistent-type-definitions
    interface Matchers<R> {
      toMatchThemeScreenshots(): Promise<R>;
    }
  }
}
