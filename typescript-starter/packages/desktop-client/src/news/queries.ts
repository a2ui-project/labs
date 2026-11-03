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

import { queryOptions } from '@tanstack/react-query';

import { fetchNewsFeed } from './fetchNewsFeed';
import type { NewsFeed } from './types';

const SIX_HOURS = 6 * 60 * 60 * 1000;

export const newsQueries = {
  all: () => ['news'],
  feed: () =>
    queryOptions<NewsFeed>({
      queryKey: [...newsQueries.all(), 'feed'],
      queryFn: fetchNewsFeed,
      // News changes rarely; one request per session is plenty.
      staleTime: SIX_HOURS,
      // Keep the feed cached after the page unmounts so the titlebar bell
      // doesn't trigger a refetch on every navigation.
      gcTime: Infinity,
      // Being offline is a normal state for a local-first app, not an error worth retrying repeatedly.
      retry: 1,
    }),
};
