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

import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import type { NavigateOptions } from 'react-router';

/**
 * Hook to get and set a specific URL search parameter value
 */
export function useUrlParam(name: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const setParam = useCallback(
    (value: string | null | undefined, opts?: NavigateOptions) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (value == null || value === '') {
          next.delete(name);
        } else {
          next.set(name, value);
        }
        return next;
      }, opts);
    },
    [name, setSearchParams],
  );

  return [searchParams.get(name), setParam] as const;
}
