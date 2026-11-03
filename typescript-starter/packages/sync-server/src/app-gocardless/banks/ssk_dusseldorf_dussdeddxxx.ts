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

  institutionIds: ['SSK_DUSSELDORF_DUSSDEDDXXX'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    // If the transaction is not booked yet by the bank, don't import it.
    // Reason being that the transaction doesn't have the information yet
    // to make the payee and notes field be of any use. It's filled with
    // a placeholder text and wouldn't be corrected on the next sync.
    if (!booked) {
      console.debug(
        'Skipping unbooked transaction:',
        transaction.transactionId,
      );
      return null;
    }

    // Prioritize unstructured information, falling back to structured formats
    let remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured ??
      transaction.remittanceInformationStructured ??
      transaction.remittanceInformationStructuredArray?.join(' ');

    if (transaction.additionalInformation) {
      remittanceInformationUnstructured = [
        remittanceInformationUnstructured,
        transaction.additionalInformation,
      ]
        .filter(Boolean)
        .join(' ');
    }

    const usefulCreditorName =
      transaction.ultimateCreditor ||
      transaction.creditorName ||
      transaction.debtorName;

    editedTrans.creditorName = usefulCreditorName;
    editedTrans.remittanceInformationUnstructured =
      remittanceInformationUnstructured;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
