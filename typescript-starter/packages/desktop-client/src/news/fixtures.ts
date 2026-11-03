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

import { NEWS_FEED_SCHEMA_VERSION } from './types';
import type { NewsFeed } from './types';

/**
 * Deterministic feed returned instead of a network request when running
 * under Playwright, so end-to-end tests and screenshots are stable.
 */
export const newsFeedFixture: NewsFeed = {
  schemaVersion: NEWS_FEED_SCHEMA_VERSION,
  entries: [
    {
      id: 'release-99.9.9',
      type: 'release',
      title: 'Release 99.9.9',
      date: '2026-01-01',
      version: '99.9.9',
      url: 'https://actualbudget.org/blog/release-99.9.9',
      body: 'A test release used by end-to-end tests.\n\n- Adds a fixture release\n- Keeps screenshots stable\n\n:::warning Deprecation\n\nRule action templating is deprecated in favour of formulae.\n\n:::\n\n:::info\nThe `edge` tag has been renamed to `nightly`.\n:::',
      details:
        '#### Features\n\n- [#1](https://github.com/actualbudget/actual/pull/1) Add a fixture feature — thanks @actual\n\n#### Bugfixes\n\n- [#2](https://github.com/actualbudget/actual/pull/2) Fix a fixture bug — thanks @actual',
    },
    {
      id: 'post-fixture-post',
      type: 'post',
      title: 'A fixture blog post',
      date: '2025-12-01',
      url: 'https://actualbudget.org/blog/fixture-post',
      body: 'A test announcement used by end-to-end tests.',
    },
  ],
};
