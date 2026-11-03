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

import { getAccountDb } from '../src/account-db';

export const up = async function () {
  const accountDb = getAccountDb();

  accountDb.transaction(() => {
    accountDb.exec(
      `
    CREATE TABLE users
        (id TEXT PRIMARY KEY,
        user_name TEXT,
        display_name TEXT,
        role TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        owner INTEGER NOT NULL DEFAULT 0);

    CREATE TABLE user_access
      (user_id TEXT,
      file_id TEXT,
      PRIMARY KEY (user_id, file_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (file_id) REFERENCES files(id)
      );

    ALTER TABLE files
        ADD COLUMN owner TEXT;

    ALTER TABLE sessions
        ADD COLUMN expires_at INTEGER;

    ALTER TABLE sessions
        ADD COLUMN user_id TEXT;

    ALTER TABLE sessions
        ADD COLUMN auth_method TEXT;
        `,
    );

    const userId = uuidv4();
    accountDb.mutate(
      'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, 1, 1, ?)',
      [userId, '', '', 'ADMIN'],
    );

    accountDb.mutate(
      'UPDATE sessions SET user_id = ?, expires_at = ?, auth_method = ? WHERE auth_method IS NULL',
      [userId, -1, 'password'],
    );
  });
};

export const down = async function () {
  await getAccountDb().exec(
    `
      BEGIN TRANSACTION;

      DROP TABLE IF EXISTS user_access;

      CREATE TABLE sessions_backup (
          token TEXT PRIMARY KEY
      );

      INSERT INTO sessions_backup (token)
      SELECT token FROM sessions;

      DROP TABLE sessions;

      ALTER TABLE sessions_backup RENAME TO sessions;

      CREATE TABLE files_backup (
          id TEXT PRIMARY KEY,
          group_id TEXT,
          sync_version SMALLINT,
          encrypt_meta TEXT,
          encrypt_keyid TEXT,
          encrypt_salt TEXT,
          encrypt_test TEXT,
          deleted BOOLEAN DEFAULT FALSE,
          name TEXT
      );

      INSERT INTO files_backup (
          id,
          group_id,
          sync_version,
          encrypt_meta,
          encrypt_keyid,
          encrypt_salt,
          encrypt_test,
          deleted,
          name
      )
      SELECT
          id,
          group_id,
          sync_version,
          encrypt_meta,
          encrypt_keyid,
          encrypt_salt,
          encrypt_test,
          deleted,
          name
      FROM files;

      DROP TABLE files;

      ALTER TABLE files_backup RENAME TO files;

      DROP TABLE IF EXISTS users;

      COMMIT;
      `,
  );
};
