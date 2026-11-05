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
import {extractPayeeNameFromRemittanceInfo} from './util/extract-payeeName-from-remittanceInfo';

export default {
  ...Fallback,

  institutionIds: ['KBC_KREDBEBB', 'KBC_BRUSSELS_KREDBEBB'],

  /**
   * For negative amounts, the only payee information we have is returned in
   * remittanceInformationUnstructured.
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = {...transaction};

    if (Number(transaction.transactionAmount.amount) > 0) {
      editedTrans.payeeName =
        transaction.debtorName || transaction.remittanceInformationUnstructured || 'undefined';
    } else {
      editedTrans.payeeName =
        transaction.creditorName ||
        extractPayeeNameFromRemittanceInfo(transaction.remittanceInformationUnstructured ?? '', [
          'Betaling met',
          'Domiciliëring',
          'Overschrijving',
        ]);
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
