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

  institutionIds: ['REVOLUT_REVOLT21'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = {...transaction};

    const infoArray = transaction.remittanceInformationUnstructuredArray ?? [];

    if (infoArray[0]?.startsWith('Bizum payment from: ')) {
      editedTrans.payeeName = infoArray[0].replace('Bizum payment from: ', '');
      editedTrans.remittanceInformationUnstructured = infoArray[1];
    }

    if (infoArray[0]?.startsWith('Bizum payment to: ')) {
      editedTrans.remittanceInformationUnstructured = infoArray[1];
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
