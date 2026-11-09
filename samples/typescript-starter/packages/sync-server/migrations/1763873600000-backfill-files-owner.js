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

import {getAccountDb} from '../src/account-db';

export const up = async function () {
  const accountDb = getAccountDb();

  const admin = accountDb.first('SELECT id FROM users WHERE role = ? ORDER BY id LIMIT 1', [
    'ADMIN',
  ]);
  if (admin) {
    accountDb.mutate('UPDATE files SET owner = ? WHERE owner IS NULL', [admin.id]);
  }
};

export const down = async function () {
  // Cannot reliably restore NULL owner for backfilled rows; no-op.
};
