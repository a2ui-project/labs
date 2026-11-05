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

import {cmpSemanticVersion} from '#util/versions';

import type {NewsEntry} from './types';

type ReleaseEntry = NewsEntry & {type: 'release'; version: string};

function isRelease(entry: NewsEntry): entry is ReleaseEntry {
  return entry.type === 'release' && entry.version !== undefined;
}

/**
 * Entries published after the date the user last looked at the feed. Until a
 * baseline date exists (first run) nothing counts as unseen, so a new user
 * isn't greeted with a backlog of "unread" history.
 */
export function getUnseenEntries(
  entries: NewsEntry[],
  lastSeenDate: string | undefined,
): NewsEntry[] {
  if (!lastSeenDate) {
    return [];
  }
  return entries.filter(entry => entry.date > lastSeenDate);
}

export function getNewestDate(entries: NewsEntry[]): string | undefined {
  return entries.reduce<string | undefined>(
    (newest, entry) => (newest === undefined || entry.date > newest ? entry.date : newest),
    undefined,
  );
}

/**
 * The release to tell the user about: the newest unseen release they are
 * already running. Releases newer than the client are left to the existing
 * "update available" notification.
 */
export function getReleaseToNotify(
  entries: NewsEntry[],
  clientVersion: string,
  lastSeenDate: string | undefined,
): ReleaseEntry | undefined {
  return getUnseenEntries(entries, lastSeenDate)
    .filter(isRelease)
    .filter(entry => cmpSemanticVersion(entry.version, clientVersion) <= 0)
    .sort((entryA, entryB) => (entryA.date < entryB.date ? 1 : -1))[0];
}
