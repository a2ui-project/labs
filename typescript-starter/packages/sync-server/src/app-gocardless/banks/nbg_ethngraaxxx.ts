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

import { amountToInteger } from '#app-gocardless/utils';

import type { IBank } from './bank.interface';
import Fallback from './integration-bank';

export default {
  ...Fallback,

  institutionIds: ['NBG_ETHNGRAAXXX'],

  /**
   * Fixes for the pending transactions:
   * - Corrects amount to negative (nbg erroneously omits the minus sign in pending transactions)
   * - Removes prefix 'ΑΓΟΡΑ' from remittance information to align with the booked transaction (necessary for fuzzy matching to work)
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    if (
      !transaction.transactionId &&
      (transaction.remittanceInformationUnstructured ?? '').startsWith('ΑΓΟΡΑ ')
    ) {
      transaction.transactionAmount = {
        amount: '-' + transaction.transactionAmount.amount,
        currency: transaction.transactionAmount.currency,
      };
      editedTrans.remittanceInformationUnstructured = (
        transaction.remittanceInformationUnstructured ?? ''
      ).substring(6);
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },

  /**
   *  For NBG_ETHNGRAAXXX we don't know what balance was
   *  after each transaction so we have to calculate it by getting
   *  current balance from the account and subtract all the transactions
   *
   *  As a current balance we use `interimBooked` balance type because
   *  it includes transaction placed during current day
   */
  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      balance => 'interimAvailable' === balance.balanceType,
    );

    return sortedTransactions.reduce(
      (total, trans) => {
        return total - amountToInteger(trans.transactionAmount.amount);
      },
      amountToInteger(currentBalance?.balanceAmount.amount || 0),
    );
  },
} satisfies IBank;
