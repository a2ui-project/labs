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

import * as d from 'date-fns';

import type { IBank } from './bank.interface';
import Fallback from './integration-bank';

export default {
  ...Fallback,

  institutionIds: ['SWEDBANK_HABALV22'],

  /**
   * The actual transaction date for card transactions is only available in the remittanceInformationUnstructured field when the transaction is booked.
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    const isCardTransaction =
      transaction.remittanceInformationUnstructured?.startsWith('PIRKUMS');

    if (isCardTransaction) {
      if (!booked && !transaction.creditorName) {
        const creditorNameMatch =
          transaction.remittanceInformationUnstructured?.match(
            /PIRKUMS [\d*]+ \d{2}\.\d{2}\.\d{2} \d{2}:\d{2} [\d.]+ \w{3} \(\d+\) (.+)/,
          );

        if (creditorNameMatch) {
          editedTrans.creditorName = creditorNameMatch[1];
        }
      }

      const dateMatch = transaction.remittanceInformationUnstructured?.match(
        /PIRKUMS [\d*]+ (\d{2}\.\d{2}\.\d{4})/,
      );

      if (dateMatch) {
        const extractedDate = d
          .parse(dateMatch[1], 'dd.MM.yyyy', new Date())
          .toISOString();

        editedTrans.date = extractedDate;
      }
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
