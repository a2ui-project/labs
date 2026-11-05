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

import {useEffect, useState} from 'react';

import {send} from '@actual-app/core/platform/client/connection';
import type {BankSyncProviderStatus} from '@actual-app/core/types/models';

import {useSyncServerStatus} from './useSyncServerStatus';

export function usePluggyAiStatus() {
  const [pluggyAiStatus, setPluggyAiStatus] = useState<BankSyncProviderStatus>({});
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('pluggyai-status');

      setPluggyAiStatus(results);
      setIsLoading(false);
    }

    if (status !== 'online') {
      setPluggyAiStatus({});
      return;
    }

    void fetch();
  }, [status]);

  return {
    pluggyAiStatus,
    setPluggyAiStatus,
    isLoading,
  };
}
