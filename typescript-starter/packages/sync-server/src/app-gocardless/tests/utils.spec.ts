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

import { mockTransactionAmount } from '#app-gocardless/services/tests/fixtures';
import { sortByBookingDateOrValueDate } from '#app-gocardless/utils';

describe('utils', () => {
  describe('#sortByBookingDate', () => {
    it('sorts transactions by bookingDate field from newest to oldest', () => {
      const transactions = [
        {
          bookingDate: '2023-01-01',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-20',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-10',
          transactionAmount: mockTransactionAmount,
        },
      ];
      expect(sortByBookingDateOrValueDate(transactions)).toEqual([
        {
          bookingDate: '2023-01-20',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-10',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-01',
          transactionAmount: mockTransactionAmount,
        },
      ]);
    });

    it('should sort by valueDate if bookingDate is missing', () => {
      const transactions = [
        {
          valueDate: '2023-01-01',
          transactionAmount: mockTransactionAmount,
        },
        {
          valueDate: '2023-01-20',
          transactionAmount: mockTransactionAmount,
        },
        {
          valueDate: '2023-01-10',
          transactionAmount: mockTransactionAmount,
        },
      ];
      expect(sortByBookingDateOrValueDate(transactions)).toEqual([
        {
          valueDate: '2023-01-20',
          transactionAmount: mockTransactionAmount,
        },
        {
          valueDate: '2023-01-10',
          transactionAmount: mockTransactionAmount,
        },
        {
          valueDate: '2023-01-01',
          transactionAmount: mockTransactionAmount,
        },
      ]);
    });

    it('should use bookingDate primarily even if bookingDateTime is on an other date', () => {
      const transactions = [
        {
          bookingDate: '2023-01-01',
          bookingDateTime: '2023-01-01T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-10',
          bookingDateTime: '2023-01-01T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-01',
          bookingDateTime: '2023-01-01T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-10',
          bookingDateTime: '2023-01-01T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
      ];
      expect(sortByBookingDateOrValueDate(transactions)).toEqual([
        {
          bookingDate: '2023-01-10',
          bookingDateTime: '2023-01-01T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-10',
          bookingDateTime: '2023-01-01T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-01',
          bookingDateTime: '2023-01-01T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-01',
          bookingDateTime: '2023-01-01T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
      ]);
    });

    it('should sort on booking date if value date is widely off', () => {
      const transactions = [
        {
          bookingDate: '2023-01-01',
          valueDateTime: '2023-01-31T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-02',
          valueDateTime: '2023-01-02T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-30',
          valueDateTime: '2023-01-01T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-30',
          valueDateTime: '2023-01-01T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
      ];
      expect(sortByBookingDateOrValueDate(transactions)).toEqual([
        {
          bookingDate: '2023-01-30',
          valueDateTime: '2023-01-01T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-30',
          valueDateTime: '2023-01-01T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-02',
          valueDateTime: '2023-01-02T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-01',
          valueDateTime: '2023-01-31T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
      ]);
    });
  });
});
