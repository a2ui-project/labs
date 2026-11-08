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

/**
 *  Credit for this code goes to Nebukadneza at https://github.com/Nebukadneza
 */
import {amountToInteger} from '#app-gocardless/utils';

import type {IBank} from './bank.interface';
import Fallback from './integration-bank';

export default {
  ...Fallback,
  institutionIds: ['SSK_MUNCHEN_SSKMDEMMXXX'],
  normalizeTransaction(transaction, booked) {
    const editedTrans = {...transaction};
    let remittanceInformationUnstructured;
    if (transaction.remittanceInformationUnstructured) {
      remittanceInformationUnstructured = transaction.remittanceInformationUnstructured;
    } else if (transaction.remittanceInformationStructured) {
      remittanceInformationUnstructured = transaction.remittanceInformationStructured;
    } else if ((transaction.remittanceInformationStructuredArray?.length ?? 0) > 0) {
      remittanceInformationUnstructured =
        transaction.remittanceInformationStructuredArray?.join(' ');
    }
    if (transaction.additionalInformation) {
      remittanceInformationUnstructured += ' ' + transaction.additionalInformation;
    }
    const usefulCreditorName =
      transaction.ultimateCreditor || transaction.creditorName || transaction.debtorName;
    editedTrans.creditorName = usefulCreditorName;
    editedTrans.remittanceInformationUnstructured = remittanceInformationUnstructured;
    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
  /**
   *  For SANDBOXFINANCE_SFIN0000 we don't know what balance was
   *  after each transaction so we have to calculate it by getting
   *  current balance from the account and subtract all the transactions
   *
   *  As a current balance we use `interimBooked` balance type because
   *  it includes transaction placed during current day
   */
  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(balance => 'interimAvailable' === balance.balanceType);
    return sortedTransactions.reduce(
      (total, trans) => {
        return total - amountToInteger(trans.transactionAmount.amount);
      },
      amountToInteger(currentBalance?.balanceAmount.amount || 0),
    );
  },
} satisfies IBank;
