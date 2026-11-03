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

import type { AccountGroupEntity } from './account-group';
import type { BankSyncProviders } from './bank-sync';

export type AccountEntity = {
  id: string;
  name: string;
  offbudget: 0 | 1;
  closed: 0 | 1;
  sort_order: number;
  last_reconciled: string | null;
  tombstone: 0 | 1;
  account_group_id: AccountGroupEntity['id'] | null;

  // Sync fields
  account_id: string | null;
  bank: string | null;
  bankName: string | null;
  bankId: string | null;
  mask: string | null; // end of bank account number
  official_name: string | null;
  balance_current: number | null;
  balance_available: number | null;
  balance_limit: number | null;
  account_sync_source: AccountSyncSource | null;
  last_sync: string | null;
  bank_sync_status: BankSyncStatus | null;
};

export type AccountSyncSource = BankSyncProviders;

export type BankSyncStatus =
  | 'ok'
  | 'pending'
  | 'sync-requested'
  | 'failed'
  | 'reauth-required'
  | 'attention-required'
  | 'rate-limit-exceeded'
  | 'timed-out'
  | 'account-missing';
