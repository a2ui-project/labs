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

import Virgin from '#app-gocardless/banks/virgin_nrnbgb22';
import { mockTransactionAmount } from '#app-gocardless/services/tests/fixtures';

describe('Virgin', () => {
  describe('#normalizeTransaction', () => {
    it('does not alter simple payee information', () => {
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        remittanceInformationUnstructured: 'DIRECT DEBIT PAYMENT',
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Virgin.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual('Direct Debit Payment');
      expect(normalizedTransaction?.notes).toEqual('DIRECT DEBIT PAYMENT');
    });

    it('formats bank transfer payee and references', () => {
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        remittanceInformationUnstructured: 'FPS, Joe Bloggs, Food',
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Virgin.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual('Joe Bloggs');
      expect(normalizedTransaction?.notes).toEqual('Food');
    });

    it('removes method information from payee name', () => {
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        remittanceInformationUnstructured: 'Card 99, Tesco Express',
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Virgin.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.payeeName).toEqual('Tesco Express');
      expect(normalizedTransaction?.notes).toEqual('Card 99, Tesco Express');
    });
  });
});
