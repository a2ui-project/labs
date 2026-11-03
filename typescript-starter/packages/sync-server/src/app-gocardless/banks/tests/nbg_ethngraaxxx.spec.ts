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

import NbgEthngraaxxx from '#app-gocardless/banks/nbg_ethngraaxxx';

describe('NbgEthngraaxxx', () => {
  describe('#normalizeTransaction', () => {
    it('provides correct amount in pending transaction and removes payee prefix', () => {
      const transaction = {
        bookingDate: '2024-09-03',
        date: '2024-09-03',
        remittanceInformationUnstructured: 'ΑΓΟΡΑ testingson',
        transactionAmount: {
          amount: '100.00',
          currency: 'EUR',
        },
        valueDate: '2024-09-03',
      };

      const normalizedTransaction = NbgEthngraaxxx.normalizeTransaction(
        transaction,
        false,
      );

      expect(normalizedTransaction?.transactionAmount.amount).toEqual(
        '-100.00',
      );
      expect(normalizedTransaction?.payeeName).toEqual('Testingson');
    });
  });

  it('provides correct amount and payee in booked transaction', () => {
    const transaction = {
      transactionId: 'O244015L68IK',
      bookingDate: '2024-09-03',
      date: '2024-09-03',
      remittanceInformationUnstructured: 'testingson',
      transactionAmount: {
        amount: '-100.00',
        currency: 'EUR',
      },
      valueDate: '2024-09-03',
    };

    const normalizedTransaction = NbgEthngraaxxx.normalizeTransaction(
      transaction,
      true,
    );

    expect(normalizedTransaction?.transactionAmount.amount).toEqual('-100.00');
    expect(normalizedTransaction?.payeeName).toEqual('Testingson');
  });
});
