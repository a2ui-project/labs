-- Copyright 2024 Google LLC
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--     https://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.

BEGIN TRANSACTION;

CREATE TABLE schedules
  (id TEXT PRIMARY KEY,
   rule TEXT,
   active INTEGER DEFAULT 0,
   completed INTEGER DEFAULT 0,
   posts_transaction INTEGER DEFAULT 0,
   tombstone INTEGER DEFAULT 0);

CREATE TABLE schedules_next_date
  (id TEXT PRIMARY KEY,
   schedule_id TEXT,
   local_next_date INTEGER,
   local_next_date_ts INTEGER,
   base_next_date INTEGER,
   base_next_date_ts INTEGER);

CREATE TABLE schedules_json_paths
  (schedule_id TEXT PRIMARY KEY,
   payee TEXT,
   account TEXT,
   amount TEXT,
   date TEXT);

ALTER TABLE transactions ADD COLUMN schedule TEXT;

COMMIT;
