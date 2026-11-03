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

import type { AccountEntity } from '@actual-app/core/types/models';

export function isAccountFailedSync(
  account: Pick<AccountEntity, 'bank_sync_status'>,
) {
  const status = account.bank_sync_status;
  return (
    status != null &&
    status !== 'ok' &&
    status !== 'pending' &&
    status !== 'sync-requested'
  );
}

export function getFailedSyncError(
  account: Pick<AccountEntity, 'bank_sync_status' | 'account_sync_source'>,
): { type: string; code: string } {
  switch (account.bank_sync_status) {
    case 'reauth-required':
      if (account.account_sync_source === 'simpleFin') {
        return { type: 'INVALID_ACCESS_TOKEN', code: 'INVALID_ACCESS_TOKEN' };
      }
      return { type: 'ITEM_ERROR', code: 'ITEM_LOGIN_REQUIRED' };
    case 'attention-required':
      return {
        type: 'ACCOUNT_NEEDS_ATTENTION',
        code: 'ACCOUNT_NEEDS_ATTENTION',
      };
    case 'rate-limit-exceeded':
      return { type: 'RATE_LIMIT_EXCEEDED', code: 'RATE_LIMIT_EXCEEDED' };
    case 'timed-out':
      return { type: 'TIMED_OUT', code: 'TIMED_OUT' };
    case 'account-missing':
      return { type: 'ACCOUNT_MISSING', code: 'ACCOUNT_MISSING' };
    default:
      return { type: 'SYNC_ERROR', code: 'SYNC_ERROR' };
  }
}
