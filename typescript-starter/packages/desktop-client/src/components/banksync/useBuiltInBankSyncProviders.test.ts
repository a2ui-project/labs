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

import { getPermissionWarning } from './useBuiltInBankSyncProviders';

test.each([
  ['offline', true, true, null],
  ['no-server', false, false, null],
  ['online', true, false, null],
  ['online', false, false, 'general'],
  ['online', false, true, 'file-owner'],
] as const)(
  'returns the expected warning for %s connectivity, admin %s, owner %s',
  (status, isAdmin, isFileOwner, expected) => {
    expect(getPermissionWarning(status, isAdmin, isFileOwner)).toBe(expected);
  },
);
