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

import Nationwide from '#app-gocardless/banks/nationwide_naiagb21';
import { mockTransactionAmount } from '#app-gocardless/services/tests/fixtures';

describe('Nationwide', () => {
  describe('#normalizeTransaction', () => {
    it('retains date for booked transaction', () => {
      const d = new Date();
      d.setDate(d.getDate() - 7);

      const date = d.toISOString().split('T')[0];

      const transaction = {
        bookingDate: date,
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Nationwide.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.date).toEqual(date);
    });

    it('fixes date for pending transactions', () => {
      const d = new Date();
      const date = d.toISOString().split('T')[0];

      const transaction = {
        bookingDate: date,
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Nationwide.normalizeTransaction(
        transaction,
        false,
      );

      expect(
        new Date(normalizedTransaction?.date ?? '').getTime(),
      ).toBeLessThan(d.getTime());
    });

    it('keeps transactionId if in the correct format', () => {
      const transactionId = 'a896729bb8b30b5ca862fe70bd5967185e2b5d3a';
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        transactionId,
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Nationwide.normalizeTransaction(
        transaction,
        false,
      );

      expect(normalizedTransaction?.transactionId).toBe(transactionId);
    });

    it('unsets transactionId if not valid length', () => {
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        transactionId: '0123456789',
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Nationwide.normalizeTransaction(
        transaction,
        false,
      );

      expect(normalizedTransaction?.transactionId).toBeUndefined();
    });

    it('unsets transactionId if debit placeholder found', () => {
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        transactionId: '00DEBIT202401010000000000-1000SUPERMARKET',
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Nationwide.normalizeTransaction(
        transaction,
        false,
      );

      expect(normalizedTransaction?.transactionId).toBeUndefined();
    });

    it('unsets transactionId if credit placeholder found', () => {
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        transactionId: '00CREDIT202401010000000000-1000SUPERMARKET',
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Nationwide.normalizeTransaction(
        transaction,
        false,
      );

      expect(normalizedTransaction?.transactionId).toBeUndefined();
    });
  });
});
