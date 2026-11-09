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

import type {Key} from 'react-aria-components';

export type SidebarTreeKey = `account:${string}` | `group:${string}`;

export type SidebarTreeNode =
  | {kind: 'account'; accountId: string}
  | {kind: 'group'; groupId: string};

export const treeKeys = {
  account(accountId: string): SidebarTreeKey {
    return `account:${accountId}`;
  },
  group(groupId: string): SidebarTreeKey {
    return `group:${groupId}`;
  },
};

export function parseTreeKey(key: Key): SidebarTreeNode | null {
  if (typeof key !== 'string') {
    return null;
  }
  if (key.startsWith('account:')) {
    return {kind: 'account', accountId: key.slice('account:'.length)};
  }
  if (key.startsWith('group:')) {
    return {kind: 'group', groupId: key.slice('group:'.length)};
  }
  return null;
}
