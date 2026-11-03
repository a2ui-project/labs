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

import KBCkredbebb from '#app-gocardless/banks/kbc_kredbebb';

describe('kbc_kredbebb', () => {
  describe('#normalizeTransaction', () => {
    it('returns the remittanceInformationUnstructured as payeeName when the amount is negative', () => {
      const transaction = {
        remittanceInformationUnstructured:
          'CARREFOUR ST GIL BE1060 BRUXELLES Betaling met Google Pay via Debit Mastercard 28-08-2024 om 19.15 uur 5127 04XX XXXX 1637 5853 98XX XXXX 2266 JOHN SMITH',
        transactionAmount: { amount: '-10.99', currency: 'EUR' },
        date: new Date().toISOString(),
      };
      const normalizedTransaction = KBCkredbebb.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction?.payeeName).toEqual(
        'CARREFOUR ST GIL BE1060 BRUXELLES',
      );
    });

    it('returns the debtorName as payeeName when the amount is positive', () => {
      const transaction = {
        debtorName: 'CARREFOUR ST GIL BE1060 BRUXELLES',
        remittanceInformationUnstructured:
          'CARREFOUR ST GIL BE1060 BRUXELLES Betaling met Google Pay via Debit Mastercard 28-08-2024 om 19.15 uur 5127 04XX XXXX 1637 5853 98XX XXXX 2266 JOHN SMITH',
        transactionAmount: { amount: '10.99', currency: 'EUR' },
        date: new Date().toISOString(),
      };
      const normalizedTransaction = KBCkredbebb.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction?.payeeName).toEqual(
        'CARREFOUR ST GIL BE1060 BRUXELLES',
      );
    });
  });
});
