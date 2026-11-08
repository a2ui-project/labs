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

import LhvLhvbee22 from '#app-gocardless/banks/lhv_lhvbee22';
import type {Transaction} from '#app-gocardless/gocardless-node.types';

describe('#normalizeTransaction', () => {
  const bookedCardTransaction = {
    transactionId: '2025010300000000-1',
    bookingDate: '2025-01-03',
    valueDate: '2025-01-03',
    transactionAmount: {
      amount: '-22.99',
      currency: 'EUR',
    },
    creditorName: null,
    remittanceInformationUnstructured:
      '(..1234) 2025-01-02 09:32 CrustumOU\\Poordi 3\\Tallinn\\10156     ESTEST',
    bankTransactionCode: 'PMNT-CCRD-POSD',
    internalTransactionId: 'fa000f86afb2cc7678bcff0000000000',
  } as unknown as Transaction;

  it('extracts booked card transaction creditor name', () => {
    expect(LhvLhvbee22.normalizeTransaction(bookedCardTransaction, true)?.payeeName).toEqual(
      'CrustumOU',
    );
  });

  it('extracts booked card transaction date', () => {
    expect(LhvLhvbee22.normalizeTransaction(bookedCardTransaction, true)?.date).toEqual(
      '2025-01-02',
    );
  });

  it.each([
    ['regular text', 'Some info'],
    ['partial card text', 'PIRKUMS xxx'],
    ['null value', null],
    ['invalid date', '(..1234) 2025-13-45 09:32 Merchant\\Address'],
  ])('normalizes non-card transaction with %s', (_, remittanceInfo) => {
    const transaction = {
      ...bookedCardTransaction,
      remittanceInformationUnstructured: remittanceInfo,
    } as Transaction;
    const normalized = LhvLhvbee22.normalizeTransaction(transaction, true);

    expect(normalized?.date).toEqual('2025-01-03');
  });

  const pendingCardTransaction = {
    transactionId: '2025010300000000-1',
    valueDate: '2025-01-03',
    transactionAmount: {
      amount: '-22.99',
      currency: 'EUR',
    },
    remittanceInformationUnstructured:
      '(..1234) 2025-01-02 09:32 CrustumOU\\Poordi 3\\Tallinn\\10156     ESTEST',
  };

  it('extracts pending card transaction creditor name', () => {
    expect(LhvLhvbee22.normalizeTransaction(pendingCardTransaction, false)?.payeeName).toEqual(
      'CrustumOU',
    );
  });

  it('extracts pending card transaction date', () => {
    expect(LhvLhvbee22.normalizeTransaction(pendingCardTransaction, false)?.date).toEqual(
      '2025-01-03',
    );
  });
});
