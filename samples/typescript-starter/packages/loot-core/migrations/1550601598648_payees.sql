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

CREATE TABLE payees
  (id TEXT PRIMARY KEY,
   name TEXT,
   category TEXT,
   tombstone INTEGER DEFAULT 0,
   transfer_acct TEXT);

CREATE TABLE payee_rules
  (id TEXT PRIMARY KEY,
   payee_id TEXT,
   type TEXT,
   value TEXT,
   tombstone INTEGER DEFAULT 0);

CREATE INDEX payee_rules_lowercase_index ON payee_rules(LOWER(value));

CREATE TABLE payee_mapping
  (id TEXT PRIMARY KEY,
   targetId TEXT);

COMMIT;
