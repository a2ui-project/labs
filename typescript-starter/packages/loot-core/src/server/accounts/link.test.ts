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
import { loadMappings } from '#server/db/mappings';

import { findOrCreateBank } from './link';

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
});

async function getBanks() {
  return await db.all<db.DbBank>(
    'SELECT id, bank_id, name FROM banks ORDER BY name',
  );
}

describe('findOrCreateBank', () => {
  it('creates a bank when none exists for the connection', async () => {
    const bank = await findOrCreateBank({ name: 'Robinhood' }, 'robinhood.com');

    expect(await getBanks()).toEqual([
      expect.objectContaining({
        id: bank.id,
        bank_id: 'robinhood.com',
        name: 'Robinhood',
      }),
    ]);
  });

  it('reuses the existing bank when the same connection is linked again', async () => {
    const first = await findOrCreateBank(
      { name: 'Robinhood' },
      'robinhood.com',
    );
    const second = await findOrCreateBank(
      { name: 'Robinhood' },
      'robinhood.com',
    );

    expect(second.id).toBe(first.id);
    expect(await getBanks()).toHaveLength(1);
  });

  it('keeps connections apart when they share an id but report different institutions', async () => {
    const first = await findOrCreateBank(
      { name: 'Robinhood (Person A)' },
      'robinhood.com',
    );
    const second = await findOrCreateBank(
      { name: 'Robinhood (Person B)' },
      'robinhood.com',
    );

    expect(second.id).not.toBe(first.id);
    expect(await getBanks()).toEqual([
      expect.objectContaining({
        id: first.id,
        bank_id: 'robinhood.com',
        name: 'Robinhood (Person A)',
      }),
      expect.objectContaining({
        id: second.id,
        bank_id: 'robinhood.com',
        name: 'Robinhood (Person B)',
      }),
    ]);
  });

  it('reuses the existing bank when the provider reports no institution', async () => {
    const first = await findOrCreateBank(null, 'robinhood.com');
    const second = await findOrCreateBank({ name: null }, 'robinhood.com');

    expect(second.id).toBe(first.id);
    expect(await getBanks()).toEqual([
      expect.objectContaining({ bank_id: 'robinhood.com', name: null }),
    ]);
  });

  it('accepts an institution reported as a plain string', async () => {
    const first = await findOrCreateBank('Robinhood', 'robinhood.com');
    const second = await findOrCreateBank(
      { name: 'Robinhood' },
      'robinhood.com',
    );

    expect(second.id).toBe(first.id);
    expect(await getBanks()).toHaveLength(1);
  });
});
