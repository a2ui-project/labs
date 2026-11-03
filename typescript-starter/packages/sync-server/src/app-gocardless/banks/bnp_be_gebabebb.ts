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
    'FINTRO_BE_GEBABEBB',
    'HELLO_BE_GEBABEBB',
    'BNP_BE_GEBABEBB',
  ],

  /** BNP_BE_GEBABEBB provides a lot of useful information via the 'additionalField'
   *  There does not seem to be a specification of this field, but the following information is contained in its subfields:
   *  - for pending transactions: the 'atmPosName'
   *  - for booked transactions: the 'narrative'.
   *  This narrative subfield is most useful as it contains information required to identify the transaction,
   *  especially in case of debit card or instant payment transactions.
   *  Do note that the narrative subfield ALSO contains the remittance information if any.
   *  The goal of the  normalization is to place any relevant information of the additionalInformation
   *  field in the remittanceInformationUnstructuredArray field.
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    // Extract the creditor name to fill it in with information from the
    // additionalInformation field in case it's not yet defined.
    let creditorName = transaction.creditorName;

    if (transaction.additionalInformation) {
      const additionalInformationObject: Record<string, string> = {};
      const additionalInfoRegex = /(, )?([^:]+): ((\[.*?\])|([^,]*))/g;
      const matches =
        transaction.additionalInformation.matchAll(additionalInfoRegex);
      if (matches) {
        let creditorNameFromNarrative; // Possible value for creditorName
        for (const match of matches) {
          const key = match[2].trim();
          let value = (match[4] || match[5]).trim();
          if (key === 'narrative') {
            // Set narrativeName to the first element in the "narrative" array.
            const first_value = value.matchAll(/'(.+?)'/g)?.next().value;
            creditorNameFromNarrative = first_value
              ? first_value[1].trim()
              : undefined;
          }
          // Remove square brackets and single quotes and commas
          value = value.replace(/[[\]',]/g, '');
          additionalInformationObject[key] = value;
        }
        // Keep existing unstructuredArray and add atmPosName and narrative
        editedTrans.remittanceInformationUnstructuredArray = [
          ...(transaction.remittanceInformationUnstructuredArray ?? []),
          additionalInformationObject?.atmPosName,
          additionalInformationObject?.narrative,
        ].filter(Boolean) as string[];

        // If the creditor name doesn't exist in the original transactions,
        // set it to the atmPosName or narrativeName if they exist; otherwise
        // leave empty and let the default rules handle it.
        creditorName =
          creditorName ??
          additionalInformationObject?.atmPosName ??
          creditorNameFromNarrative ??
          null;
      }
    }

    editedTrans.creditorName = creditorName;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
