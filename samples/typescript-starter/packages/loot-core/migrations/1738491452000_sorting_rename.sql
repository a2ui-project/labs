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

ALTER TABLE custom_reports RENAME COLUMN sort_by TO sort_by_old;
ALTER TABLE custom_reports ADD COLUMN sort_by TEXT DEFAULT 'desc';

UPDATE custom_reports SET sort_by = 'desc' where sort_by_old = 'Descending';
UPDATE custom_reports SET sort_by = 'asc' where sort_by_old = 'Ascending';
UPDATE custom_reports SET sort_by = 'budget' where sort_by_old = 'Budget';
UPDATE custom_reports SET sort_by = 'name' where sort_by_old = 'Name';

ALTER TABLE custom_reports DROP COLUMN sort_by_old;

COMMIT;
