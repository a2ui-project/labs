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

import type {Transaction} from './gocardless-node.types';

export const printIban = (account: {iban?: string | null}): string => {
  if (account.iban) {
    return '(XXX ' + account.iban.slice(-4) + ')';
  } else {
    return '';
  }
};

const compareDates = (
  a: string | number | Date | undefined,
  b: string | number | Date | undefined,
): number => {
  if (a == null && b == null) {
    return 0;
  } else if (a == null) {
    return 1;
  } else if (b == null) {
    return -1;
  }

  return +new Date(a) - +new Date(b);
};

const compareFunctions: ((a: Transaction, b: Transaction) => number)[] = [
  (a, b) => compareDates(a.bookingDate, b.bookingDate),
  (a, b) => compareDates(a.bookingDateTime, b.bookingDateTime),
  (a, b) => compareDates(a.valueDate, b.valueDate),
  (a, b) => compareDates(a.valueDateTime, b.valueDateTime),
];

export const sortByBookingDateOrValueDate = <T extends Transaction>(transactions: T[] = []): T[] =>
  transactions.sort((a, b) => {
    for (const sortFunction of compareFunctions) {
      const result = sortFunction(b, a);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  });

export const amountToInteger = (n: string | number): number => Math.round(Number(n) * 100);
