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
  await getAccountDb().exec(
    `
    BEGIN TRANSACTION;
     CREATE TABLE auth_new
        (method TEXT PRIMARY KEY,
        display_name TEXT,
        extra_data TEXT, active INTEGER);

    INSERT INTO auth_new (method, display_name, extra_data, active)
      SELECT 'password', 'Password', password, 1 FROM auth;
        DROP TABLE auth;
        ALTER TABLE auth_new RENAME TO auth;

    CREATE TABLE pending_openid_requests
      (state TEXT PRIMARY KEY,
      code_verifier TEXT,
      return_url TEXT,
      expiry_time INTEGER);
    COMMIT;`,
  );
};

export const down = async function () {
  await getAccountDb().exec(
    `
    BEGIN TRANSACTION;
    ALTER TABLE auth RENAME TO auth_temp;
    CREATE TABLE auth
        (password TEXT);
    INSERT INTO auth (password)
      SELECT extra_data FROM auth_temp WHERE method = 'password';
    DROP TABLE auth_temp;

    DROP TABLE pending_openid_requests;
    COMMIT;
      `,
  );
};
