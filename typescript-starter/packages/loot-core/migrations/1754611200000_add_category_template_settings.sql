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

-- Add a column to track where a category's automation templates come from
-- Allowed values for source (by convention): 'notes' | 'ui'
ALTER TABLE categories ADD COLUMN template_settings JSON DEFAULT '{"source": "notes"}';

UPDATE categories SET template_settings = '{"source": "ui"}' WHERE template_settings IS NULL;
