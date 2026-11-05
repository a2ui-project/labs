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

const SYNCED_PREF_KEYS = [
  'firstDayOfWeekIdx',
  'dateFormat',
  'numberFormat',
  'hideFraction',
  'isPrivacyEnabled',
  /^show-extra-balances-/,
  /^hide-cleared-/,
  /^parse-date-/,
  /^csv-mappings-/,
  /^csv-delimiter-/,
  /^csv-has-header-/,
  /^ofx-fallback-missing-payee-/,
  /^flip-amount-/,
  'budgetType',
  /^flags\./,
];

export default async function runMigration(db, {fs, fileId}) {
  await db.execQuery(`
    CREATE TABLE preferences
       (id TEXT PRIMARY KEY,
        value TEXT);
  `);

  try {
    const budgetDir = fs.getBudgetDir(fileId);
    const fullpath = fs.join(budgetDir, 'metadata.json');

    const prefs = JSON.parse(await fs.readFile(fullpath));

    if (typeof prefs !== 'object') {
      return;
    }

    await Promise.all(
      Object.keys(prefs).map(async key => {
        // Check if the current key is of synced-keys type
        if (
          !SYNCED_PREF_KEYS.find(keyMatcher =>
            keyMatcher instanceof RegExp ? keyMatcher.test(key) : keyMatcher === key,
          )
        ) {
          return;
        }

        // insert the synced prefs in the new table
        db.runQuery('INSERT INTO preferences (id, value) VALUES (?, ?)', [key, String(prefs[key])]);
      }),
    );
  } catch {
    // Do nothing
  }
}
