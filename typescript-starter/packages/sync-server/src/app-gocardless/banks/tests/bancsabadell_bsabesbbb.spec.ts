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

import Sabadell from '#app-gocardless/banks/bancsabadell_bsabesbbb';

describe('BancSabadell', () => {
  describe('#normalizeTransaction', () => {
    describe('returns the creditorName and debtorName from remittanceInformationUnstructuredArray', () => {
      it('debtor role - amount < 0', () => {
        const transaction = {
          transactionAmount: { amount: '-100', currency: 'EUR' },
          remittanceInformationUnstructuredArray: ['some-creditor-name'],
          internalTransactionId: 'd7dca139cf31d9',
          transactionId: '04704109322',
          bookingDate: '2022-05-01',
        };
        const normalizedTransaction = Sabadell.normalizeTransaction(
          transaction,
          true,
        );
        expect(normalizedTransaction?.payeeName).toEqual('Some-Creditor-Name');
      });

      it('creditor role - amount > 0', () => {
        const transaction = {
          transactionAmount: { amount: '100', currency: 'EUR' },
          remittanceInformationUnstructuredArray: ['some-debtor-name'],
          internalTransactionId: 'd7dca139cf31d9',
          transactionId: '04704109322',
          bookingDate: '2022-05-01',
        };
        const normalizedTransaction = Sabadell.normalizeTransaction(
          transaction,
          true,
        );
        expect(normalizedTransaction?.payeeName).toEqual('Some-Debtor-Name');
      });
    });

    it('extract date', () => {
      const transaction = {
        transactionAmount: { amount: '-100', currency: 'EUR' },
        remittanceInformationUnstructuredArray: ['some-creditor-name'],
        internalTransactionId: 'd7dca139cf31d9',
        transactionId: '04704109322',
        bookingDate: '2024-10-02',
        valueDate: '2024-10-05',
      };
      const normalizedTransaction = Sabadell.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction?.date).toEqual('2024-10-02');
    });
  });
});
