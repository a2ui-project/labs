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

DELETE FROM spreadsheet_cells WHERE
  name NOT LIKE '%!budget\_%' ESCAPE '\' AND
  name NOT LIKE '%!carryover\_%' ESCAPE '\' AND
  name NOT LIKE '%!buffered';

UPDATE OR REPLACE spreadsheet_cells SET name = REPLACE(name, '_', '-');

UPDATE OR REPLACE spreadsheet_cells SET
  name =
    SUBSTR(name, 1, 28) ||
    '-' ||
    SUBSTR(name, 29, 4) ||
    '-' ||
    SUBSTR(name, 33, 4) ||
    '-' ||
    SUBSTR(name, 37, 4) ||
    '-' ||
    SUBSTR(name, 41, 12)
WHERE name LIKE '%!budget-%' AND LENGTH(name) = 52;

UPDATE OR REPLACE spreadsheet_cells SET
  name =
    SUBSTR(name, 1, 31) ||
    '-' ||
    SUBSTR(name, 32, 4) ||
    '-' ||
    SUBSTR(name, 36, 4) ||
    '-' ||
    SUBSTR(name, 40, 4) ||
    '-' ||
    SUBSTR(name, 44, 12)
WHERE name LIKE '%!carryover-%' AND LENGTH(name) = 55;

UPDATE spreadsheet_cells SET expr = SUBSTR(expr, 2) WHERE name LIKE '%!carryover-%';

COMMIT;
