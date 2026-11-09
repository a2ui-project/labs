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

  institutionIds: ['VIRGIN_NRNBGB22'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = {...transaction};

    const transferPrefixes = ['MOB', 'FPS'];
    const methodRegex = /^(Card|WLT)\s\d+/;

    const parts = (transaction.remittanceInformationUnstructured ?? '').split(', ');

    if (transferPrefixes.includes(parts[0])) {
      // Transfer remittance information begins with either "MOB" or "FPS"
      // the second field contains the payee and the third contains the
      // reference

      editedTrans.creditorName = parts[1];
      editedTrans.debtorName = parts[1];
      editedTrans.remittanceInformationUnstructured = parts[2];
    } else if (parts[0].match(methodRegex)) {
      // The payee is prefixed with the payment method, eg "Card 11, {payee}"

      editedTrans.creditorName = parts[1];
      editedTrans.debtorName = parts[1];
    } else {
      // Simple payee name

      editedTrans.creditorName = transaction.remittanceInformationUnstructured;
      editedTrans.debtorName = transaction.remittanceInformationUnstructured;
    }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
