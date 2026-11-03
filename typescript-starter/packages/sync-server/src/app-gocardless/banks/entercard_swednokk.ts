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

  institutionIds: ['ENTERCARD_SWEDNOKK'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    // GoCardless's Entercard integration returns forex transactions with the
    // foreign amount in `transactionAmount`, but at least the amount actually
    // billed to the account is now available in
    // `remittanceInformationUnstructured`.
    const remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured ?? '';
    if (remittanceInformationUnstructured.startsWith('billingAmount: ')) {
      transaction.transactionAmount = {
        amount: remittanceInformationUnstructured.substring(15),
        currency: 'SEK',
      };
    }

    editedTrans.date = transaction.valueDate;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    return sortedTransactions.reduce(
      (total, trans) => {
        return total - amountToInteger(trans.transactionAmount.amount);
      },
      amountToInteger(balances[0]?.balanceAmount.amount || 0),
    );
  },
} satisfies IBank;
