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
import { escapeRegExp } from './util/escape-regexp';

export default {
  ...Fallback,

  institutionIds: ['COMMERZBANK_COBADEFF'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    // remittanceInformationUnstructured is limited to 140 chars thus ...
    // ... missing information form remittanceInformationUnstructuredArray ...
    // ... so we recreate it.
    editedTrans.remittanceInformationUnstructured = (
      transaction.remittanceInformationUnstructuredArray ?? []
    ).join(' ');

    // The limitations of remittanceInformationUnstructuredArray ...
    // ... can result in split keywords. We fix these. Other ...
    // ... splits will need to be fixed by user with rules.
    const keywords = [
      'End-to-End-Ref.:',
      'Mandatsref:',
      'Gläubiger-ID:',
      'SEPA-BASISLASTSCHRIFT',
      'Kartenzahlung',
      'Dauerauftrag',
    ];
    keywords.forEach(keyword => {
      editedTrans.remittanceInformationUnstructured = (
        editedTrans.remittanceInformationUnstructured ?? ''
      ).replace(
        // There can be spaces in keywords
        RegExp(keyword.split('').join('\\s*'), 'gi'),
        ', ' + keyword + ' ',
      );
    });

    // Clean up remittanceInformation, deduplicate payee (removing slashes ...
    // ... that are added to the remittanceInformation field), and ...
    // ... remove clutter like "End-to-End-Ref.: NOTPROVIDED"
    const payee = escapeRegExp(
      transaction.creditorName || transaction.debtorName || '',
    );
    editedTrans.remittanceInformationUnstructured =
      editedTrans.remittanceInformationUnstructured
        .replace(/\s*(,)?\s+/g, '$1 ')
        .replace(RegExp(payee.split(' ').join('(/*| )'), 'gi'), ' ')
        .replace(', End-to-End-Ref.: NOTPROVIDED', '')
        .trim();

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
