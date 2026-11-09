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

UPDATE transactions AS t1
SET schedule = (
    SELECT t2.schedule FROM transactions AS t2
    WHERE t2.id = t1.transferred_id
      AND t2.schedule IS NOT NULL
    LIMIT 1
)
WHERE t1.schedule IS NULL
AND t1.transferred_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM transactions AS t2
  WHERE t2.id = t1.transferred_id
    AND t2.schedule IS NOT NULL
  LIMIT 1
);

COMMIT;
