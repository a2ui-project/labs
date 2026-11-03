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

import type {
  Balance,
  Transaction,
} from '#app-gocardless/gocardless-node.types';
import type {
  DetailedAccountWithInstitution,
  NormalizedAccountDetails,
} from '#app-gocardless/gocardless.types';

type TransactionExtended = Transaction & {
  date?: string;
  payeeName?: string;
  notes?: string;
  remittanceInformationUnstructuredArrayString?: string;
  remittanceInformationStructuredArrayString?: string;
};

type NormalizedTransaction = Transaction & {
  date: string;
  payeeName: string;
  notes: string;
  remittanceInformationUnstructuredArrayString?: string;
  remittanceInformationStructuredArrayString?: string;
};

export type IBank = {
  institutionIds: string[];

  /**
   * Returns normalized object with required data for the frontend
   */
  normalizeAccount: (
    account: DetailedAccountWithInstitution,
  ) => NormalizedAccountDetails;

  /**
   * Returns a normalized transaction object
   *
   * The GoCardless integrations with different banks are very inconsistent in
   * what each of the different date fields actually mean, so this function is
   * expected to set a `date` field which corresponds to the expected
   * transaction date.
   */
  normalizeTransaction: (
    transaction: TransactionExtended,
    booked: boolean,
    editedTransaction?: TransactionExtended,
  ) => NormalizedTransaction | null;

  /**
   * Function sorts an array of transactions from newest to oldest
   */
  sortTransactions: <T extends Transaction>(transactions: T[]) => T[];

  /**
   * Calculates account balance before which was before transactions provided in sortedTransactions param
   */
  calculateStartingBalance: (
    sortedTransactions: Transaction[],
    balances: Balance[],
  ) => number;
};
