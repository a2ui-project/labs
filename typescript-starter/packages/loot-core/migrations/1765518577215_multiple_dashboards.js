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

import { v4 as uuidv4 } from 'uuid';

export default async function runMigration(db) {
  db.transaction(() => {
    // 1. Create dashboards table
    db.execQuery(`
      CREATE TABLE dashboard_pages
        (id TEXT PRIMARY KEY,
         name TEXT,
         tombstone INTEGER DEFAULT 0);
    `);

    // 2. Add dashboard_page_id to dashboard (widgets) table
    db.execQuery(`
      ALTER TABLE dashboard ADD COLUMN dashboard_page_id TEXT;
    `);

    // 3. Create a default dashboard
    const defaultDashboardId = uuidv4();
    db.runQuery(`INSERT INTO dashboard_pages (id, name) VALUES (?, ?)`, [
      defaultDashboardId,
      'Main',
    ]);

    // 4. Migrate existing widgets to the default dashboard
    db.runQuery(`UPDATE dashboard SET dashboard_page_id = ?`, [
      defaultDashboardId,
    ]);
  });
}
