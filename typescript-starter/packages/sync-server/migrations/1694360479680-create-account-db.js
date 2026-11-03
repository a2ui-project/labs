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

import { getAccountDb } from '../src/account-db';

export const up = async function () {
  await getAccountDb().exec(`
    CREATE TABLE IF NOT EXISTS auth
      (password TEXT PRIMARY KEY);

    CREATE TABLE IF NOT EXISTS sessions
      (token TEXT PRIMARY KEY);

    CREATE TABLE IF NOT EXISTS files
      (id TEXT PRIMARY KEY,
       group_id TEXT,
       sync_version SMALLINT,
       encrypt_meta TEXT,
       encrypt_keyid TEXT,
       encrypt_salt TEXT,
       encrypt_test TEXT,
       deleted BOOLEAN DEFAULT FALSE,
       name TEXT);
  `);
};

export const down = async function () {
  await getAccountDb().exec(`
    DROP TABLE auth;
    DROP TABLE sessions;
    DROP TABLE files;
  `);
};
