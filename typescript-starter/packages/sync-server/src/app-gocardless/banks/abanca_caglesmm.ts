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

  institutionIds: [
    'ABANCA_CAGLESMM',
    'ABANCA_CAGLPTPL',
    'ABANCA_CORP_CAGLPTPL',
  ],

  // Abanca transactions doesn't get the creditorName/debtorName properly
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    editedTrans.creditorName = transaction.remittanceInformationStructured;
    editedTrans.debtorName = transaction.remittanceInformationStructured;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
