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

import CBCcregbebb from '#app-gocardless/banks/cbc_cregbebb';

describe('cbc_cregbebb', () => {
  describe('#normalizeTransaction', () => {
    it('returns the remittanceInformationUnstructured as payeeName when the amount is negative', () => {
      const transaction = {
        remittanceInformationUnstructured:
          'ONKART FR Viry Paiement Maestro par Carte de débit CBC 05-09-2024 à 15.43 heures 6703 19XX XXXX X201 5 JOHN DOE',
        transactionAmount: {amount: '-45.00', currency: 'EUR'},
        date: new Date().toISOString(),
      };
      const normalizedTransaction = CBCcregbebb.normalizeTransaction(transaction, true);
      expect(normalizedTransaction?.payeeName).toEqual('ONKART FR Viry');
    });

    it('returns the debtorName as payeeName when the amount is positive', () => {
      const transaction = {
        debtorName: 'ONKART FR Viry',
        remittanceInformationUnstructured:
          'ONKART FR Viry Paiement Maestro par Carte de débit CBC 05-09-2024 à 15.43 heures 6703 19XX XXXX X201 5 JOHN DOE',
        transactionAmount: {amount: '10.99', currency: 'EUR'},
        date: new Date().toISOString(),
      };
      const normalizedTransaction = CBCcregbebb.normalizeTransaction(transaction, true);
      expect(normalizedTransaction?.payeeName).toEqual('ONKART FR Viry');
    });
  });
});
