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

import Abanca from '#app-gocardless/banks/abanca_caglesmm';
import {mockTransactionAmount} from '#app-gocardless/services/tests/fixtures';

describe('Abanca', () => {
  describe('#normalizeTransaction', () => {
    it('returns the creditorName and debtorName as remittanceInformationStructured', () => {
      const transaction = {
        transactionId: 'non-unique-id',
        internalTransactionId: 'D202301180000003',
        transactionAmount: mockTransactionAmount,
        remittanceInformationStructured: 'some-creditor-name',
        date: new Date().toISOString(),
      };
      const normalizedTransaction = Abanca.normalizeTransaction(transaction, true);
      expect(normalizedTransaction?.payeeName).toEqual('Some-Creditor-Name');
    });
  });
});
