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

import {amountToInteger} from '#app-gocardless/utils';

import type {IBank} from './bank.interface';
import Fallback from './integration-bank';

export default {
  ...Fallback,

  institutionIds: ['AMERICAN_EXPRESS_AESUDEF1'],

  normalizeAccount(account) {
    return {
      ...Fallback.normalizeAccount(account),
      // The `iban` field for these American Express cards is actually a masked
      // version of the PAN.  No IBAN is provided.
      mask: account.iban.slice(-5),
      iban: null,
      name: [account.details, `(${account.iban.slice(-5)})`].join(' '),
      official_name: account.details ?? '',
    };
  },

  /**
   *  For AMERICAN_EXPRESS_AESUDEF1 we don't know what balance was
   *  after each transaction so we have to calculate it by getting
   *  current balance from the account and subtract all the transactions
   *
   *  As a current balance we use the non-standard `information` balance type
   *  which is the only one provided for American Express.
   */
  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      balance => 'information' === balance.balanceType.toString(),
    );

    return sortedTransactions.reduce(
      (total, trans) => {
        return total - amountToInteger(trans.transactionAmount.amount);
      },
      amountToInteger(currentBalance?.balanceAmount.amount || 0),
    );
  },
} satisfies IBank;
