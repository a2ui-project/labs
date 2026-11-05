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

import type {IBank} from './bank.interface';
import Fallback from './integration-bank';

export default {
  ...Fallback,

  institutionIds: ['BANCSABADELL_BSABESBB'],

  // Sabadell transactions don't get the creditorName/debtorName properly
  normalizeTransaction(transaction, booked) {
    const editedTrans = {...transaction};

    const amount = transaction.transactionAmount.amount;

    // The amount is negative for outgoing transactions, positive for incoming transactions.
    const isCreditorPayee = Number.parseFloat(amount) < 0;

    const payeeName = (transaction.remittanceInformationUnstructuredArray ?? []).join(' ').trim();

    // The payee name is the creditor name for outgoing transactions and the debtor name for incoming transactions.
    editedTrans.creditorName = isCreditorPayee ? payeeName : undefined;
    editedTrans.debtorName = isCreditorPayee ? undefined : payeeName;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
