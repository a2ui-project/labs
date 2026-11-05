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

import AbnamroAbnanl2a from '#app-gocardless/banks/abnamro_abnanl2a';

describe('AbnamroAbnanl2a', () => {
  describe('#normalizeTransaction', () => {
    it('correctly extracts the payee and when not provided', () => {
      const transaction = {
        transactionId: '0123456789012345',
        bookingDate: '2023-12-11',
        valueDateTime: '2023-12-09T15:43:37.950',
        transactionAmount: {
          amount: '-10.00',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: [
          'BEA, Betaalpas',
          'My Payee Name,PAS123',
          'NR:123A4B, 09.12.23/15:43',
          'CITY',
        ],
      };

      const normalizedTransaction = AbnamroAbnanl2a.normalizeTransaction(transaction, false);

      expect(normalizedTransaction?.notes).toEqual(
        'BEA, Betaalpas, My Payee Name,PAS123, NR:123A4B, 09.12.23/15:43, CITY',
      );
      expect(normalizedTransaction?.payeeName).toEqual('My Payee Name');
    });

    it('correctly extracts the payee for google pay', () => {
      const transaction = {
        transactionId: '0123456789012345',
        bookingDate: '2023-12-11',
        valueDateTime: '2023-12-09T15:43:37.950',
        transactionAmount: {
          amount: '-10.00',
          currency: 'EUR',
        },
        remittanceInformationUnstructuredArray: [
          'BEA, Google Pay',
          'CCV*Other payee name,PAS123',
          'NR:123A4B, 09.12.23/15:43',
          'CITY',
        ],
      };

      const normalizedTransaction = AbnamroAbnanl2a.normalizeTransaction(transaction, false);

      expect(normalizedTransaction?.notes).toEqual(
        'BEA, Google Pay, CCV*Other payee name,PAS123, NR:123A4B, 09.12.23/15:43, CITY',
      );
      expect(normalizedTransaction?.payeeName).toEqual('Other Payee Name');
    });
  });
});
