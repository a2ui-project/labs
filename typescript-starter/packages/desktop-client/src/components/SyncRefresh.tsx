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

import React, { useState } from 'react';
import type { ReactNode } from 'react';

type ChildrenProps = {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
};
type SyncRefreshProps = {
  onSync: () => Promise<void>;
  children: (props: ChildrenProps) => ReactNode;
};
export function SyncRefresh({ onSync, children }: SyncRefreshProps) {
  const [syncing, setSyncing] = useState(false);

  async function onSync_() {
    setSyncing(true);
    await onSync();
    setSyncing(false);
  }

  return <>{children({ refreshing: syncing, onRefresh: onSync_ })}</>;
}
