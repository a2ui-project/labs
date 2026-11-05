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

import type {MockInstance} from 'vitest';

import SskDusseldorfDussdeddxxx from '#app-gocardless/banks/ssk_dusseldorf_dussdeddxxx';

describe('ssk_dusseldorf_dussdeddxxx', () => {
  let consoleSpy: MockInstance;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'debug');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('#normalizeTransaction', () => {
    const bookedTransactionOne = {
      transactionId: '2024102900000000-1',
      bookingDate: '2024-10-29',
      valueDate: '2024-10-29',
      transactionAmount: {
        amount: '-99.99',
        currency: 'EUR',
      },
      creditorName: 'a useful creditor name',
      remittanceInformationStructured: 'structured information',
      remittanceInformationUnstructured: 'unstructured information',
      additionalInformation: 'some additional information',
    };

    const bookedTransactionTwo = {
      transactionId: '2024102900000000-2',
      bookingDate: '2024-10-29',
      valueDate: '2024-10-29',
      transactionAmount: {
        amount: '-99.99',
        currency: 'EUR',
      },
      creditorName: 'a useful creditor name',
      ultimateCreditor: 'ultimate creditor',
      remittanceInformationStructured: 'structured information',
      additionalInformation: 'some additional information',
    };

    it('properly combines remittance information', () => {
      expect(
        SskDusseldorfDussdeddxxx.normalizeTransaction(bookedTransactionOne, true)?.notes,
      ).toEqual('unstructured information some additional information');

      expect(
        SskDusseldorfDussdeddxxx.normalizeTransaction(bookedTransactionTwo, true)?.notes,
      ).toEqual('structured information some additional information');
    });

    it('prioritizes creditor names correctly', () => {
      expect(
        SskDusseldorfDussdeddxxx.normalizeTransaction(bookedTransactionOne, true)?.payeeName,
      ).toEqual('A Useful Creditor Name');

      expect(
        SskDusseldorfDussdeddxxx.normalizeTransaction(bookedTransactionTwo, true)?.payeeName,
      ).toEqual('Ultimate Creditor');
    });

    const unbookedTransaction = {
      transactionId: '2024102900000000-1',
      valueDate: '2024-10-29',
      transactionAmount: {
        amount: '-99.99',
        currency: 'EUR',
      },
      creditorName: 'some nonsensical creditor',
      remittanceInformationUnstructured: 'some nonsensical information',
    };

    it('returns null for unbooked transactions', () => {
      expect(SskDusseldorfDussdeddxxx.normalizeTransaction(unbookedTransaction, false)).toBeNull();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Skipping unbooked transaction:',
        unbookedTransaction.transactionId,
      );
    });
  });
});
