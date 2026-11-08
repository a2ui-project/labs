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

import type {IBank} from './bank.interface';
import Fallback from './integration-bank';

export default {
  ...Fallback,

  institutionIds: ['LHV_LHVBEE22'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = {...transaction};

    // extract bookingDate and creditorName for card transactions, e.g.
    // (..1234) 2025-01-02 09:32 CrustumOU\Poordi 3\Tallinn\10156     ESTEST
    // bookingDate: 2025-01-02
    // creditorName: CrustumOU
    const cardTxRegex = /^\(\.\.(\d{4})\) (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) (.+)$/g;
    const cardTxMatch = cardTxRegex.exec(transaction?.remittanceInformationUnstructured ?? '');

    if (cardTxMatch) {
      const extractedDate = d.parse(cardTxMatch[2], 'yyyy-MM-dd', new Date());

      editedTrans.payeeName = cardTxMatch[4].split('\\')[0].trim();

      if (booked && d.isValid(extractedDate)) {
        editedTrans.date = d.format(extractedDate, 'yyyy-MM-dd');
      }
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
