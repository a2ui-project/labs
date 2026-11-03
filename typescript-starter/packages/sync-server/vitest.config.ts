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

export default {
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    globalSetup: ['./vitest.globalSetup.js'],
    globals: true,
    coverage: {
      enabled: false,
    },
    maxWorkers: 2,
    // All test files share account.sqlite. Running files in parallel races on
    // the auth table's PRIMARY KEY (e.g. UNIQUE constraint failed: auth.method).
    fileParallelism: false,
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            {
              outputFile: './test-results/junit.xml',
              suiteName: 'sync-server',
            },
          ],
        ]
      : ['default'],
  },
};
