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

import IntegrationBank from '#app-gocardless/banks/integration-bank';
import type {Balance, Transaction} from '#app-gocardless/gocardless-node.types';
import type {DetailedAccountWithInstitution} from '#app-gocardless/gocardless.types';
import {
  mockExtendAccountsAboutInstitutions,
  mockInstitution,
} from '#app-gocardless/services/tests/fixtures';

describe('IntegrationBank', () => {
  describe('normalizeAccount', () => {
    const account = mockExtendAccountsAboutInstitutions[0];

    it('should return a normalized account object', () => {
      const normalizedAccount = IntegrationBank.normalizeAccount(account);
      expect(normalizedAccount).toEqual({
        account_id: account.id,
        institution: mockInstitution,
        mask: '4321',
        iban: account.iban,
        name: 'account-example-one (XXX 4321) PLN',
        official_name: 'Savings Account for Individuals (Retail)',
        type: 'checking',
      });
    });

    it('should return a normalized account object with masked value "0000" when no iban property is provided', () => {
      const normalizedAccount = IntegrationBank.normalizeAccount({
        ...account,
        iban: undefined,
      } as unknown as DetailedAccountWithInstitution);
      expect(normalizedAccount).toEqual({
        account_id: account.id,
        institution: mockInstitution,
        mask: '0000',
        iban: null,
        name: 'account-example-one PLN',
        official_name: 'Savings Account for Individuals (Retail)',
        type: 'checking',
      });
    });
  });

  describe('sortTransactions', () => {
    const transactions = [
      {
        date: '2022-01-01',
        bookingDate: '2022-01-01',
        transactionAmount: {amount: '100', currency: 'EUR'},
      },
      {
        date: '2022-01-03',
        bookingDate: '2022-01-03',
        transactionAmount: {amount: '100', currency: 'EUR'},
      },
      {
        date: '2022-01-02',
        bookingDate: '2022-01-02',
        transactionAmount: {amount: '100', currency: 'EUR'},
      },
    ];

    it('should return transactions sorted by bookingDate', () => {
      const sortedTransactions = IntegrationBank.sortTransactions(transactions);
      expect(sortedTransactions).toEqual([
        {
          date: '2022-01-03',
          bookingDate: '2022-01-03',
          transactionAmount: {amount: '100', currency: 'EUR'},
        },
        {
          date: '2022-01-02',
          bookingDate: '2022-01-02',
          transactionAmount: {amount: '100', currency: 'EUR'},
        },
        {
          date: '2022-01-01',
          bookingDate: '2022-01-01',
          transactionAmount: {amount: '100', currency: 'EUR'},
        },
      ]);
    });
  });

  describe('calculateStartingBalance', () => {
    const transactions: Transaction[] = [
      {
        bookingDate: '2022-01-01',
        transactionAmount: {amount: '100', currency: 'EUR'},
      },
      {
        bookingDate: '2022-02-01',
        transactionAmount: {amount: '100', currency: 'EUR'},
      },
      {
        bookingDate: '2022-03-01',
        transactionAmount: {amount: '100', currency: 'EUR'},
      },
    ];

    const balances: Balance[] = [
      {
        balanceAmount: {amount: '1000.00', currency: 'EUR'},
        balanceType: 'interimBooked',
      },
    ];

    it('should return 0 when no transactions or balances are provided', () => {
      const startingBalance = IntegrationBank.calculateStartingBalance([], []);
      expect(startingBalance).toEqual(0);
    });

    it('should return 70000 when transactions and balances are provided', () => {
      const startingBalance = IntegrationBank.calculateStartingBalance(transactions, balances);
      expect(startingBalance).toEqual(70000);
    });
  });
});
