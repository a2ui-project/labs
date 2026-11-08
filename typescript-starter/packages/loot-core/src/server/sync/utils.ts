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

import {app} from '#server/main-app';

export function isError(value: unknown): value is {error: unknown} {
  return (value as {error: unknown}).error !== undefined;
}

// Sync messages carry table/column names as data, and a newer app
// version may name a column with an SQL keyword — unquoted, that raises
// a syntax error instead of the missing-column error the deferral path
// relies on.
export function quoteSqlId(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

// Notify once per loaded budget (reset on budget load); the client-side
// notification id additionally dedupes while it's displayed
let hasNotifiedDeferredMessages = false;

export function resetDeferredMessagesNotification() {
  hasNotifiedDeferredMessages = false;
}

export function notifyDeferredMessages() {
  if (!hasNotifiedDeferredMessages) {
    hasNotifiedDeferredMessages = true;
    app.events.emit('sync', {type: 'deferred-messages'});
  }
}

// A deferred change was dropped or discarded. Emitted per incident; the
// client-side notification id dedupes while one is displayed.
export function notifyDroppedMessages() {
  app.events.emit('sync', {type: 'dropped-messages'});
}
