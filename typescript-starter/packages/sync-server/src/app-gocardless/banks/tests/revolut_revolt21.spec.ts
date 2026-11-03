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

import RevolutRevolt21 from '#app-gocardless/banks/revolut_revolt21';

describe('RevolutRevolt21', () => {
  describe('#normalizeTransaction', () => {
    it('returns the expected remittanceInformationUnstructured from a bizum expense transfer', () => {
      const transaction = {
        transactionAmount: { amount: '-1.00', currency: 'EUR' },
        remittanceInformationUnstructuredArray: [
          'Bizum payment to: CREDITOR NAME',
          'Bizum description',
        ],
        bookingDate: '2024-09-21',
      };

      const normalizedTransaction = RevolutRevolt21.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction?.notes).toEqual('Bizum description');
    });
  });

  it('returns the expected payeeName and remittanceInformationUnstructured from a bizum income transfer', () => {
    const transaction = {
      transactionAmount: { amount: '1.00', currency: 'EUR' },
      remittanceInformationUnstructuredArray: [
        'Bizum payment from: DEBTOR NAME',
        'Bizum description',
      ],
      bookingDate: '2024-09-21',
    };

    const normalizedTransaction = RevolutRevolt21.normalizeTransaction(
      transaction,
      true,
    );

    expect(normalizedTransaction?.payeeName).toEqual('DEBTOR NAME');
    expect(normalizedTransaction?.notes).toEqual('Bizum description');
  });
});
