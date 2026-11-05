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

  institutionIds: ['ING_PL_INGBPLPW'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = {...transaction};

    editedTrans.date = transaction.valueDate;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },

  sortTransactions(transactions = []) {
    return transactions.sort((a, b) => {
      return Number((b.transactionId ?? '').substr(2)) - Number((a.transactionId ?? '').substr(2));
    });
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    if (sortedTransactions.length) {
      const oldestTransaction = sortedTransactions[sortedTransactions.length - 1];
      const oldestKnownBalance = amountToInteger(
        oldestTransaction.balanceAfterTransaction?.balanceAmount.amount || 0,
      );
      const oldestTransactionAmount = amountToInteger(oldestTransaction.transactionAmount.amount);

      return oldestKnownBalance - oldestTransactionAmount;
    } else {
      return amountToInteger(
        balances.find(balance => 'interimBooked' === balance.balanceType)?.balanceAmount.amount ||
          0,
      );
    }
  },
} satisfies IBank;
