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

import {makeViews} from './views';

beforeEach(global.emptyDatabase());

const schema = {
  transactions: {
    id: {type: 'id'},
    amount: {type: 'integer'},
    transfer_id: {type: 'integer'},
  },
};

const schemaConfig = {
  views: {
    transactions: {
      fields: {
        amount: 'a_mo_unt',
      },

      v_transactions1: internalFields => {
        const fields = internalFields({
          transfer_id: 'CASE WHEN amount < 4 THEN null ELSE transfer_id END',
        });

        return `SELECT ${fields} FROM transactions`;
      },

      v_transactions2: (_, publicFields) => {
        const fields = publicFields({
          transfer_id: 'COERCE(transfer_id, "foo")',
        });

        return `SELECT ${fields} FROM v_transactions1`;
      },
    },
  },
};

describe('schema views', () => {
  test('generates views with all the right fields', () => {
    const str = makeViews(schema, schemaConfig);
    expect(str).toMatch('DROP VIEW IF EXISTS v_transactions1;');
    expect(str).toMatch(
      'CREATE VIEW v_transactions1 AS SELECT _.id, _.a_mo_unt AS amount, CASE WHEN amount < 4 THEN null ELSE transfer_id END AS transfer_id FROM transactions;',
    );
    expect(str).toMatch('DROP VIEW IF EXISTS v_transactions2;');
    expect(str).toMatch(
      'CREATE VIEW v_transactions2 AS SELECT _.id, _.amount, COERCE(transfer_id, "foo") AS transfer_id FROM v_transactions1;',
    );

    db.execQuery('DROP TABLE transactions');
    db.execQuery(
      'CREATE TABLE transactions (id TEXT PRIMARY KEY, a_mo_unt INTEGER, transfer_id TEXT)',
    );

    // Make sure the string is valid SQL
    db.execQuery(str);
  });
});
