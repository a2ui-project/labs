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

import type { TransactionEntity } from '#types/models/transaction';

import { validForMerge } from './merge';

describe('validForMerge', () => {
  const t1: TransactionEntity = {
    id: 'id1',
    account: 'one',
    amount: 12,
    date: '2025-01-01',
  };
  const t2: TransactionEntity = {
    id: 'id2',
    account: 'one',
    amount: 12,
    date: '2025-01-01',
  };

  it('cannot merge if different accounts', () => {
    expect(validForMerge({ ...t1, account: 'other' }, t2)).toBe(false);
  });

  it('cannot merge if different amounts', () => {
    expect(validForMerge({ ...t1, amount: 13 }, t2)).toBe(false);
  });

  it('can merge if everything matches', () => {
    expect(validForMerge(t1, t2)).toBe(true);
  });

  it('cannot merge if both transfers but transfer to different accounts', () => {
    const transfer1 = { ...t1, transfer_id: 'transfer1', payee: 'account3' };
    const transfer2 = { ...t2, transfer_id: 'transfer2', payee: 'account4' };
    expect(validForMerge(transfer1, transfer2)).toBe(false);
  });

  it('can merge if both transfers and transfer to the same account', () => {
    const transfer1 = { ...t1, transfer_id: 'transfer1', payee: 'account3' };
    const transfer2 = { ...t2, transfer_id: 'transfer2', payee: 'account3' };
    expect(validForMerge(transfer1, transfer2)).toBe(true);
  });
});
