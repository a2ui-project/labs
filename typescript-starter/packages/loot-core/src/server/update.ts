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

// @ts-strict-ignore
import {createHash} from 'node:crypto';

import {makeViews, schema, schemaConfig} from './aql';
import * as db from './db';
import * as migrations from './migrate/migrations';

// Managing the init/update process

async function runMigrations() {
  await migrations.migrate(db.getDatabase());
}

async function updateViews() {
  const hashKey = 'view-hash';
  const row = await db.first<{value: string}>('SELECT value FROM __meta__ WHERE key = ?', [
    hashKey,
  ]);
  const {value: hash} = row || {};

  const views = makeViews(schema, schemaConfig);
  const currentHash = createHash('md5').update(views).digest('hex');

  if (hash !== currentHash) {
    db.execQuery(views);
    db.runQuery('INSERT OR REPLACE INTO __meta__ (key, value) VALUES (?, ?)', [
      hashKey,
      currentHash,
    ]);
  }
}

export async function updateVersion() {
  await runMigrations();
  await updateViews();
}
