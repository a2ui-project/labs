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

import { useEffect, useState } from 'react';

import { listen } from '@actual-app/core/platform/client/connection';

import { useMetadataPref } from '#hooks/useMetadataPref';

export type SyncState = null | 'offline' | 'local' | 'disabled' | 'error';

type UseSyncStatusOpts = {
  syncingEndDelayMs?: number;
};

export function useSyncStatus({
  syncingEndDelayMs = 0,
}: UseSyncStatusOpts = {}): {
  isSyncing: boolean;
  syncState: SyncState;
} {
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(null);

  useEffect(() => {
    let endTimeout: ReturnType<typeof setTimeout> | null = null;

    const unlisten = listen('sync-event', event => {
      if (event.type === 'start') {
        if (endTimeout) {
          clearTimeout(endTimeout);
          endTimeout = null;
        }
        setIsSyncing(true);
        setSyncState(null);
      } else if (syncingEndDelayMs > 0) {
        endTimeout = setTimeout(() => {
          setIsSyncing(false);
          endTimeout = null;
        }, syncingEndDelayMs);
      } else {
        setIsSyncing(false);
      }

      if (event.type === 'error') {
        if (event.subtype === 'network') {
          setSyncState('offline');
        } else if (!cloudFileId) {
          setSyncState('local');
        } else {
          setSyncState('error');
        }
      } else if (event.type === 'success') {
        setSyncState(event.syncDisabled ? 'disabled' : null);
      }
    });

    return () => {
      if (endTimeout) {
        clearTimeout(endTimeout);
      }
      unlisten();
    };
  }, [cloudFileId, syncingEndDelayMs]);

  return { isSyncing, syncState };
}
