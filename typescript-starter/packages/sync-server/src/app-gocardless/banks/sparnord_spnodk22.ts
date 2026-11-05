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

  institutionIds: [
    'SPARNORD_SPNODK22',
    'LAGERNES_BANK_LAPNDKK1',
    'ANDELSKASSEN_FALLESKASSEN_FAELDKK1',
  ],

  /**
   * Banks on the BEC backend only give information regarding the transaction in additionalInformation
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = {...transaction};

    editedTrans.remittanceInformationUnstructured = transaction.additionalInformation;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
