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

  institutionIds: ['ING_INGDDEFF'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    const remittanceInformationMatch = /remittanceinformation:(.*)$/.exec(
      transaction.remittanceInformationUnstructured ?? '',
    );

    editedTrans.remittanceInformationUnstructured = remittanceInformationMatch
      ? remittanceInformationMatch[1]
      : transaction.remittanceInformationUnstructured;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },

  sortTransactions(transactions = []) {
    return transactions.sort((a, b) => {
      const diff =
        +new Date(b.valueDate || b.bookingDate || '') -
        +new Date(a.valueDate || a.bookingDate || '');
      if (diff) return diff;
      const idA = parseInt(a.transactionId ?? '');
      const idB = parseInt(b.transactionId ?? '');
      if (!isNaN(idA) && !isNaN(idB)) return idB - idA;
      return 0;
    });
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      balance => 'interimBooked' === balance.balanceType,
    );

    return sortedTransactions.reduce(
      (total, trans) => {
        return total - amountToInteger(trans.transactionAmount.amount);
      },
      amountToInteger(currentBalance?.balanceAmount.amount || 0),
    );
  },
} satisfies IBank;
