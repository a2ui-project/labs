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

import * as db from '#server/db';

export async function createPayee(description: string) {
  // Check to make sure no payee already exists with exactly the same
  // name
  const row = await db.first<Pick<db.DbPayee, 'id'>>(
    `SELECT id FROM payees WHERE UNICODE_LOWER(name) = ? AND tombstone = 0`,
    [description.toLowerCase()],
  );

  if (row) {
    return row.id;
  } else {
    return (await db.insertPayee({name: description})) as db.DbPayee['id'];
  }
}

export async function getStartingBalancePayee() {
  let category = await db.first<db.DbCategory>(`
    SELECT * FROM categories
      WHERE is_income = 1 AND
      LOWER(name) = 'starting balances' AND
      tombstone = 0
  `);
  if (category === null) {
    category = await db.first<db.DbCategory>(
      'SELECT * FROM categories WHERE is_income = 1 AND tombstone = 0',
    );
  }

  const id = await createPayee('Starting Balance');
  return {
    id,
    category: category ? category.id : null,
  };
}
