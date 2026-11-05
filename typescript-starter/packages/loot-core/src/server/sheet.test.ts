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
import {generateTransaction} from '#mocks';

import * as db from './db';
import * as sheet from './sheet';

beforeEach(global.emptyDatabase());

async function insertTransactions() {
  await db.insertCategoryGroup({id: 'group1', name: 'group1'});
  await db.insertCategory({id: 'cat1', name: 'cat1', cat_group: 'group1'});
  await db.insertCategory({id: 'cat2', name: 'cat2', cat_group: 'group1'});

  await db.insertTransaction(
    generateTransaction({
      id: 'trans1',
      amount: -3200,
      account: '1',
      category: 'cat1',
      date: '2017-01-08',
    })[0],
  );
  await db.insertTransaction(
    generateTransaction({
      id: 'trans2',
      amount: -2800,
      account: '1',
      category: 'cat2',
      date: '2017-01-10',
    })[0],
  );
  await db.insertTransaction(
    generateTransaction({
      id: 'trans3',
      amount: -9832,
      account: '1',
      category: 'cat2',
      date: '2017-01-15',
    })[0],
  );
}

describe('Spreadsheet', () => {
  test('transferring a category triggers an update', async () => {
    const spreadsheet = await sheet.loadSpreadsheet(db);
    await insertTransactions();

    spreadsheet.startTransaction();
    spreadsheet.set(
      'g!foo',
      `=from transactions where category = "cat2" calculate { sum(amount) }`,
    );
    spreadsheet.endTransaction();

    await new Promise(resolve => {
      spreadsheet.onFinish(() => {
        expect(spreadsheet.getValue('g!foo')).toMatchSnapshot();
        resolve(undefined);
      });
    });

    await db.deleteCategory({id: 'cat1'}, 'cat2');

    return new Promise(resolve => {
      spreadsheet.onFinish(() => {
        expect(spreadsheet.getValue('g!foo')).toMatchSnapshot();
        resolve(undefined);
      });
    });
  });

  test('updating still works after transferring categories', async () => {
    const spreadsheet = await sheet.loadSpreadsheet(db);
    await insertTransactions();

    await db.deleteCategory({id: 'cat1'}, 'cat2');

    spreadsheet.startTransaction();
    spreadsheet.set(
      'g!foo',
      `=from transactions where category = "cat2" calculate { sum(amount) }`,
    );
    spreadsheet.endTransaction();

    await new Promise(resolve => {
      spreadsheet.onFinish(() => {
        expect(spreadsheet.getValue('g!foo')).toMatchSnapshot();
        resolve(undefined);
      });
    });

    await db.updateTransaction({id: 'trans1', amount: 50000});

    await new Promise(resolve => {
      spreadsheet.onFinish(() => {
        expect(spreadsheet.getValue('g!foo')).toMatchSnapshot();
        resolve(undefined);
      });
    });
  });
});
