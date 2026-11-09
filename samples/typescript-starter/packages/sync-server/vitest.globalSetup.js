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

import {getAccountDb} from './src/account-db';
import {run as runMigrations} from './src/migrations';

const GENERIC_ADMIN_ID = 'genericAdmin';
const GENERIC_USER_ID = 'genericUser';
const ADMIN_ROLE_ID = 'ADMIN';
const BASIC_ROLE_ID = 'BASIC';

const createUser = (userId, userName, role, owner = 0, enabled = 1) => {
  const missingParams = [];
  if (!userId) missingParams.push('userId');
  if (!userName) missingParams.push('userName');
  if (!role) missingParams.push('role');
  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
  }

  if (typeof userId !== 'string' || typeof userName !== 'string' || typeof role !== 'string') {
    throw new Error('Invalid parameter types. userId, userName, and role must be strings');
  }

  try {
    getAccountDb().mutate(
      'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, userName, userName, enabled, owner, role],
    );
  } catch (error) {
    console.error(`Error creating user ${userName}:`, error);
    throw error;
  }
};

const setSessionUser = (userId, token = 'valid-token') => {
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const db = getAccountDb();
    const session = db.first('SELECT token FROM sessions WHERE token = ?', [token]);
    if (!session) {
      throw new Error(`Session not found for token: ${token}`);
    }

    db.mutate('UPDATE sessions SET user_id = ? WHERE token = ?', [userId, token]);
  } catch (error) {
    console.error(`Error updating session for user ${userId}:`, error);
    throw error;
  }
};

export async function setup() {
  const NEVER_EXPIRES = -1; // or consider using a far future timestamp

  await runMigrations();

  createUser(GENERIC_ADMIN_ID, 'admin', ADMIN_ROLE_ID, 1);

  // Insert a fake "valid-token" fixture that can be reused
  const db = getAccountDb();
  try {
    await db.mutate('BEGIN TRANSACTION');

    await db.mutate('DELETE FROM sessions');
    await db.mutate('INSERT INTO sessions (token, expires_at, user_id) VALUES (?, ?, ?)', [
      'valid-token',
      NEVER_EXPIRES,
      'genericAdmin',
    ]);
    await db.mutate('INSERT INTO sessions (token, expires_at, user_id) VALUES (?, ?, ?)', [
      'valid-token-admin',
      NEVER_EXPIRES,
      'genericAdmin',
    ]);

    await db.mutate('INSERT INTO sessions (token, expires_at, user_id) VALUES (?, ?, ?)', [
      'valid-token-user',
      NEVER_EXPIRES,
      'genericUser',
    ]);

    await db.mutate('COMMIT');
  } catch (error) {
    await db.mutate('ROLLBACK');
    throw new Error(`Failed to setup test sessions: ${error.message}`);
  }

  setSessionUser('genericAdmin');
  setSessionUser('genericAdmin', 'valid-token-admin');

  createUser(GENERIC_USER_ID, 'user', BASIC_ROLE_ID, 1);
}

export async function teardown() {
  await runMigrations('down');
}
