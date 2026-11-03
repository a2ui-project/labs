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

import type { IBank } from './bank.interface';
import Fallback from './integration-bank';

export default {
  ...Fallback,

  institutionIds: ['FORTUNEO_FTNOFRP1XXX'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    // Most of the information from the transaction is in the remittanceInformationUnstructuredArray field.
    // We extract the creditor and debtor names from this field.
    // The remittanceInformationUnstructuredArray field usually contain keywords like "Vir" for
    // bank transfers or "Carte 03/06" for card payments, as well as the date.
    // We remove these keywords to get a cleaner payee name.
    const keywordsToRemove = [
      'VIR INST',
      'VIR',
      'PRLV',
      'ANN CARTE',
      'CARTE \\d{2}\\/\\d{2}',
    ];

    const details = (
      transaction.remittanceInformationUnstructuredArray ?? []
    ).join(' ');
    const amount = transaction.transactionAmount.amount;

    const regex = new RegExp(keywordsToRemove.join('|'), 'g');
    const payeeName = details.replace(regex, '').trim();

    // The amount is negative for outgoing transactions, positive for incoming transactions.
    const isCreditorPayee = parseFloat(amount) < 0;

    // The payee name is the creditor name for outgoing transactions and the debtor name for incoming transactions.
    editedTrans.creditorName = isCreditorPayee ? payeeName : undefined;
    editedTrans.debtorName = isCreditorPayee ? undefined : payeeName;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
