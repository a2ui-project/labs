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

CREATE TEMPORARY TABLE category_groups_tmp
   (id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    is_income INTEGER DEFAULT 0,
    sort_order REAL,
    tombstone INTEGER DEFAULT 0);

INSERT INTO category_groups_tmp SELECT * FROM category_groups;

DROP TABLE category_groups;

CREATE TABLE category_groups
   (id TEXT PRIMARY KEY,
    name TEXT,
    is_income INTEGER DEFAULT 0,
    sort_order REAL,
    tombstone INTEGER DEFAULT 0);

INSERT INTO category_groups SELECT * FROM category_groups_tmp;

DROP TABLE category_groups_tmp;

COMMIT;
