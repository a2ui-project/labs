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

export type NewsEntryType = 'release' | 'post';

export type NewsEntry = {
  id: string;
  type: NewsEntryType;
  title: string;
  /** ISO date (YYYY-MM-DD) the entry was published. */
  date: string;
  /** Only present for `release` entries, e.g. `26.8.1`. */
  version?: string;
  /** Absolute link to the full content on actualbudget.org. */
  url: string;
  /** Markdown body (for releases: the hand-written highlights). */
  body: string;
  /** Releases only: markdown for the full categorized list of changes. */
  details?: string;
};

export type NewsFeed = {
  schemaVersion: number;
  entries: NewsEntry[];
};

/**
 * Must match `NEWS_FEED_SCHEMA_VERSION` in
 * packages/ci-actions/src/news-feed/parse.ts. Feeds with any other version
 * are rejected, so the two must be bumped together and only for incompatible
 * changes (older clients would stop showing news until updated).
 */
export const NEWS_FEED_SCHEMA_VERSION = 1;
