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

import type { TransactionEntity } from '#types/models';

export function validForMerge(
  transactionA: TransactionEntity | undefined,
  transactionB: TransactionEntity | undefined,
) {
  return !validForMergeExplanation(transactionA, transactionB);
}

export function validForMergeExplanation(
  transactionA: TransactionEntity | undefined,
  transactionB: TransactionEntity | undefined,
): string {
  if (!transactionA || !transactionB) {
    return 'One of the provided transactions does not exist';
  }
  if (transactionA.account !== transactionB.account) {
    return 'Cannot merge transactions from different accounts';
  }
  if (transactionA.amount !== transactionB.amount) {
    return 'Cannot merge transactions with different amounts';
  }
  // if both transfers, they should both be transferring to the same account to be eligible for merge.
  // In other words, you cannot merge A->B with A->C, but you can merge A->B with A->B
  if (
    transactionA.transfer_id &&
    transactionB.transfer_id &&
    transactionA.payee !== transactionB.payee
  ) {
    return 'Cannot merge transfers to different accounts';
  }
  return '';
}
