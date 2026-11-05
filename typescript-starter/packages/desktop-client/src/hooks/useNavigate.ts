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

import {useCallback} from 'react';
import {
  useLocation,
  // oxlint-disable-next-line eslint/no-restricted-imports
  useNavigate as useNavigateReactRouter,
} from 'react-router';
import type {Location, NavigateFunction, NavigateOptions, To} from 'react-router';

export function useNavigate(): NavigateFunction {
  const location = useLocation();
  const navigate = useNavigateReactRouter();
  return useCallback(
    (to: To | number, options: NavigateOptions = {}) => {
      if (typeof to === 'number') {
        void navigate(to);
      } else {
        const optionsWithPrevLocation: NavigateOptions = {
          replace: options.replace || isSamePath(to, location) ? true : undefined,
          ...options,
          state: {
            ...options?.state,
            previousLocation: location,
          },
        };

        const {previousLocation, ...previousOriginalState} = location.state || {};

        if (
          previousLocation == null ||
          !isSamePath(to, previousLocation) ||
          JSON.stringify(options?.state || {}) !== JSON.stringify(previousOriginalState)
        ) {
          void navigate(to, optionsWithPrevLocation);
        } else {
          // `to` is the same as the previous location. Just go back.
          void navigate(-1);
        }
      }
    },
    [navigate, location],
  );
}

function isSamePath(to: To, location: Location) {
  return to === location.pathname + location.search + location.hash;
}
