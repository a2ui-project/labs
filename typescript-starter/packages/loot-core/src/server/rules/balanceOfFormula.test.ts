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

import {describe, expect, it} from 'vitest';

import type * as db from '#server/db';

import {
  decodeBalanceOfQuotedLiteral,
  extractBalanceOfLiterals,
  resolveAccountIdForBalanceOf,
} from './balanceOfFormula';

describe('balanceOfFormula', () => {
  it('extractBalanceOfLiterals returns distinct decoded literals', () => {
    expect(extractBalanceOfLiterals('=BALANCE_OF("Checking") + BALANCE_OF("Checking")')).toEqual([
      'Checking',
    ]);
    expect(extractBalanceOfLiterals('=balance_of("Savings")')).toEqual(['Savings']);
  });

  it('decodeBalanceOfQuotedLiteral unescapes quotes and backslashes', () => {
    expect(decodeBalanceOfQuotedLiteral(String.raw`\"x\"`)).toBe('"x"');
  });

  it('resolveAccountIdForBalanceOf prefers map key then name', () => {
    const id = 'acc-1';
    const a1: db.DbAccount = {
      id,
      name: 'Dup',
      offbudget: 0,
    } as db.DbAccount;
    const a2: db.DbAccount = {
      id: 'acc-2',
      name: 'Other',
      offbudget: 0,
    } as db.DbAccount;
    const map = new Map<string, db.DbAccount>([
      [id, a1],
      ['acc-2', a2],
    ]);
    expect(resolveAccountIdForBalanceOf(id, map)).toBe(id);
    expect(resolveAccountIdForBalanceOf('Other', map)).toBe('acc-2');
    expect(resolveAccountIdForBalanceOf('Nope', map)).toBe(null);
  });
});
