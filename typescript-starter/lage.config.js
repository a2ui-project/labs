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

const BUILD_OUTPUT_GLOBS = ['lib-dist/**', 'dist/**', 'build/**', '@types/**'];

/** @type {import('lage').ConfigOptions} */
module.exports = {
  pipeline: {
    typecheck: {
      type: 'npmScript',
      dependsOn: ['^typecheck'],
    },
    test: {
      type: 'npmScript',
      options: {
        outputGlob: [
          'coverage/**',
          '**/test-results/**',
          '**/playwright-report/**',
        ],
      },
    },
    build: {
      type: 'npmScript',
      dependsOn: ['^build'],
      cache: true,
      options: {
        outputGlob: BUILD_OUTPUT_GLOBS,
      },
    },
    // Not cached: the script stages files into public/ and build-stats/ that
    // fall outside BUILD_OUTPUT_GLOBS, so a cache hit would skip the side
    // effects.
    'build:browser': {
      type: 'npmScript',
      dependsOn: ['^build'],
      cache: false,
    },
  },
  cacheOptions: {
    cacheStorageConfig: {
      provider: 'local',
      outputGlob: BUILD_OUTPUT_GLOBS,
    },
  },
  npmClient: 'yarn',
  concurrency: 2,
};
