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

import { useEffect, useMemo, useState } from 'react';
import type { DependencyList } from 'react';

import type { Query } from '@actual-app/core/shared/query';

import { liveQuery } from '#queries/liveQuery';
import type { LiveQuery } from '#queries/liveQuery';

type UseQueryResult<Response> = {
  data: null | ReadonlyArray<Response>;
  isLoading: boolean;
  error?: Error;
};

export function useQuery<Response = unknown>(
  makeQuery: () => Query | null,
  dependencies: DependencyList,
): UseQueryResult<Response> {
  // Memo the resulting query. We don't care if the function
  // that creates the query changes, only the resulting query.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- caller owns deps
  const query = useMemo(makeQuery, dependencies);

  const [data, setData] = useState<ReadonlyArray<Response> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    setError(query === null ? new Error('Query is null') : undefined);
    setIsLoading(!!query);

    if (!query) {
      return;
    }

    let isUnmounted = false;
    let live: null | LiveQuery<Response> = liveQuery<Response>(query, {
      onData: data => {
        if (!isUnmounted) {
          setData(data);
          setIsLoading(false);
        }
      },
      onError: setError,
    });

    return () => {
      isUnmounted = true;
      live?.unsubscribe();
      live = null;
    };
  }, [query]);

  return {
    data,
    isLoading,
    ...(error && { error }),
  };
}
