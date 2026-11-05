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

import SwedbankHabaLV22 from '#app-gocardless/banks/swedbank_habalv22';
import type {Transaction} from '#app-gocardless/gocardless-node.types';

describe('#normalizeTransaction', () => {
  const bookedCardTransaction = {
    transactionId: '2024102900000000-1',
    bookingDate: '2024-10-29',
    valueDate: '2024-10-29',
    transactionAmount: {
      amount: '-22.99',
      currency: 'EUR',
    },
    creditorName: 'SOME CREDITOR NAME',
    remittanceInformationUnstructured:
      'PIRKUMS 424242******4242 28.10.2024 22.99 EUR (111111) SOME CREDITOR NAME',
    bankTransactionCode: 'PMNT-CCRD-POSD',
    internalTransactionId: 'fa000f86afb2cc7678bcff0000000000',
  };

  it('extracts card transaction date', () => {
    expect(SwedbankHabaLV22.normalizeTransaction(bookedCardTransaction, true)?.date).toEqual(
      '2024-10-28',
    );
  });

  it.each([
    ['regular text', 'Some info'],
    ['partial card text', 'PIRKUMS xxx'],
    ['null value', null],
  ])('normalizes non-card transaction with %s', (_, remittanceInfo) => {
    const transaction = {
      ...bookedCardTransaction,
      remittanceInformationUnstructured: remittanceInfo,
    } as Transaction;
    const normalized = SwedbankHabaLV22.normalizeTransaction(transaction, true);

    expect(normalized?.bookingDate).toEqual('2024-10-29');
    expect(normalized?.date).toEqual('2024-10-29');
  });

  const pendingCardTransaction = {
    transactionId: '2024102900000000-1',
    valueDate: '2024-10-29',
    transactionAmount: {
      amount: '-22.99',
      currency: 'EUR',
    },
    remittanceInformationUnstructured:
      'PIRKUMS 424242******4242 28.10.24 13:37 22.99 EUR (111111) SOME CREDITOR NAME',
  };

  it('extracts pending card transaction creditor name', () => {
    expect(SwedbankHabaLV22.normalizeTransaction(pendingCardTransaction, false)?.payeeName).toEqual(
      'Some Creditor Name',
    );
  });
});
