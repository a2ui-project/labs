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

PRAGMA foreign_keys = OFF;

ALTER TABLE poop RENAME TO tmp_poop;

CREATE TABLE poop
  (id INT PRIMARY KEY,
   name TEXT,
   is_expense INTEGER);

INSERT INTO poop
SELECT id, name, is_expense FROM tmp_poop;

DROP TABLE tmp_poop;

PRAGMA foreign_keys = ON;
