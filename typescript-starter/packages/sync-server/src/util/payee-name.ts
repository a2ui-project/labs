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

import type { Transaction } from '#app-gocardless/gocardless-node.types';

import { title } from './title/index';

function formatPayeeIban(iban: string) {
  return '(' + iban.slice(0, 4) + ' XXX ' + iban.slice(-4) + ')';
}

export const formatPayeeName = (trans: Transaction) => {
  const amount = Number(trans.transactionAmount.amount);
  const nameParts = [];

  // get the correct name and account fields for the transaction amount
  let name;
  let account;
  if (amount > 0 || Object.is(amount, 0)) {
    name = trans.debtorName;
    account = trans.debtorAccount;
  } else {
    name = trans.creditorName;
    account = trans.creditorAccount;
  }

  // use the correct name field if it was found
  // if not, use whatever we can find

  // if the primary name option is set, prevent the account from falling back
  account = name ? account : trans.debtorAccount || trans.creditorAccount;

  name =
    name ||
    trans.debtorName ||
    trans.creditorName ||
    trans.remittanceInformationUnstructured ||
    (trans.remittanceInformationUnstructuredArray || []).join(', ') ||
    trans.additionalInformation;

  if (name) {
    nameParts.push(title(name));
  }

  if (typeof account === 'object' && account && account.iban) {
    nameParts.push(formatPayeeIban(account.iban));
  }

  return nameParts.join(' ');
};
