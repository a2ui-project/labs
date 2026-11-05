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
import * as db from '#server/db';

// This file doesn't test the schema code directly, it tests that
// views return data as expected and various constraints on the
// sqlite3 schema itself.

beforeEach(global.emptyDatabase());

describe('schema', () => {
  test('never returns transactions without a date', async () => {
    expect((await db.all<db.DbTransaction>('SELECT * FROM transactions')).length).toBe(0);
    expect((await db.all<db.DbViewTransaction>('SELECT * FROM v_transactions')).length).toBe(0);
    db.runQuery('INSERT INTO transactions (acct) VALUES (?)', ['foo']);
    expect((await db.all<db.DbTransaction>('SELECT * FROM transactions')).length).toBe(1);
    expect((await db.all<db.DbViewTransaction>('SELECT * FROM v_transactions')).length).toBe(0);
  });

  test('never returns transactions without an account', async () => {
    expect((await db.all<db.DbTransaction>('SELECT * FROM transactions')).length).toBe(0);
    expect((await db.all<db.DbViewTransaction>('SELECT * FROM v_transactions')).length).toBe(0);
    db.runQuery('INSERT INTO transactions (date) VALUES (?)', [20200101]);
    expect((await db.all<db.DbTransaction>('SELECT * FROM transactions')).length).toBe(1);
    expect((await db.all<db.DbViewTransaction>('SELECT * FROM v_transactions')).length).toBe(0);
  });

  test('never returns child transactions without a parent', async () => {
    expect((await db.all<db.DbTransaction>('SELECT * FROM transactions')).length).toBe(0);
    expect((await db.all<db.DbViewTransaction>('SELECT * FROM v_transactions')).length).toBe(0);
    db.runQuery('INSERT INTO transactions (date, acct, isChild) VALUES (?, ?, ?)', [
      20200101,
      'foo',
      1,
    ]);
    expect((await db.all<db.DbTransaction>('SELECT * FROM transactions')).length).toBe(1);
    expect((await db.all<db.DbViewTransaction>('SELECT * FROM v_transactions')).length).toBe(0);
  });
});
