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

  institutionIds: ['BANK_OF_IRELAND_B365_BOFIIE2D'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    editedTrans.remittanceInformationUnstructured = fixupPayee(
      transaction.remittanceInformationUnstructured ?? '',
    );

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;

function fixupPayee(payee: string) {
  let fixedPayee = payee;

  // remove all duplicate whitespace
  fixedPayee = fixedPayee.replace(/\s+/g, ' ').trim();

  // remove date prefix
  fixedPayee = fixedPayee.replace(/^(POS)?(C)?[0-9]{1,2}\w{3}/, '').trim();

  // remove direct debit postfix
  fixedPayee = fixedPayee.replace(/sepa dd$/i, '').trim();

  // remove bank transfer prefix
  fixedPayee = fixedPayee.replace(/^365 online/i, '').trim();

  // remove curve card prefix
  fixedPayee = fixedPayee.replace(/^CRV\*/, '').trim();

  return fixedPayee;
}
