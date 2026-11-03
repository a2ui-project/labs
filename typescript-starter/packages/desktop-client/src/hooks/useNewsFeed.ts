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

import { useQuery } from '@tanstack/react-query';

import { newsQueries } from '#news/queries';
import type { NewsEntry } from '#news/types';
import { getNewestDate, getUnseenEntries } from '#news/utils';

import { useGlobalPref } from './useGlobalPref';

const EMPTY_ENTRIES: NewsEntry[] = [];

export function useNewsFeed() {
  // The setting (on by default) lets the user opt out of the feed and of the
  // request it makes to GitHub.
  const [showNewsFeed] = useGlobalPref('showNewsFeed');
  const isEnabled = Boolean(showNewsFeed);
  const [lastSeenNewsDate, setLastSeenNewsDate] =
    useGlobalPref('lastSeenNewsDate');

  // `enabled: false` means no request is ever made while the feature is off.
  const query = useQuery({ ...newsQueries.feed(), enabled: isEnabled });
  const entries = query.data?.entries ?? EMPTY_ENTRIES;
  const unseenCount = getUnseenEntries(entries, lastSeenNewsDate).length;

  const markAllSeen = () => {
    const newestDate = getNewestDate(entries);
    if (newestDate && newestDate !== lastSeenNewsDate) {
      setLastSeenNewsDate(newestDate);
    }
  };

  return {
    isEnabled,
    entries,
    unseenCount,
    lastSeenNewsDate,
    markAllSeen,
    isLoading: isEnabled && query.isPending,
    error: query.error,
  };
}
