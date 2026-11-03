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

import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Any workspace package's source; node_modules stays excluded by the babel
// plugin's default exclude.
const reactCompilerInclude =
  /[\\/]packages[\\/][^\\/]+[\\/]src[\\/].*\.[jt]sx?(?:$|\?)/;

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.web.test.(js|jsx|ts|tsx)'],
    maxWorkers: 2,
    reporters: process.env.CI
      ? [
          'default',
          [
            'junit',
            {
              outputFile: './test-results/junit-web.xml',
              suiteName: 'component-library (web)',
            },
          ],
        ]
      : ['default'],
  },
  plugins: [
    react(),
    babel({
      include: [reactCompilerInclude],
      // n.b. Must be a string to ensure plugin resolution order. See https://github.com/actualbudget/actual/pull/5853
      presets: [reactCompilerPreset()],
    }),
  ],
});
