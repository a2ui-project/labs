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

// Sync messages deferred because they reference schema from a newer
// app version; see `deferMessage` and `replayPendingMessages`.
//
// The DDL is shared between the migration and the runtime: the code
// that uses the table also creates it on demand, so it keeps working
// even when the served migration files are older than the code (e.g. a
// stale service-worker cache or an unrebuilt dev environment).
// Dependency-free on purpose — the migration imports this too.
export const PENDING_MESSAGES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS messages_pending
    (dataset TEXT NOT NULL,
     row TEXT NOT NULL,
     column TEXT NOT NULL,
     timestamp TEXT NOT NULL,
     -- Serialized string form, e.g. "S:hello" (see \`serializeValue\`)
     value TEXT NOT NULL,
     PRIMARY KEY (dataset, row, column));
`;
