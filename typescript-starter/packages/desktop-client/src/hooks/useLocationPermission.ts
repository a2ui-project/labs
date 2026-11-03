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

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { locationService } from '#payees/location';

export type LocationPermission = {
  isGranted: boolean;
  isPending: boolean;
  requestPermission: () => Promise<void>;
};

/**
 * Custom hook to manage geolocation permission status.
 *
 * Payee location functionality is only available on the mobile transaction
 * screen, so permission is only tracked at narrow widths.
 *
 * @returns a LocationPermissions object
 */
export function useLocationPermission(): LocationPermission {
  const { isNarrowWidth } = useResponsive();
  const [state, setState] = useState<PermissionState | null>(null);

  useEffect(() => {
    if (!isNarrowWidth) {
      setState(null);
      return;
    }

    let permissionStatus: PermissionStatus | null = null;
    let handleChange: (() => void) | null = null;
    let isMounted = true;

    // Check if Permissions API is available
    if (
      !navigator.permissions ||
      typeof navigator.permissions.query !== 'function'
    ) {
      setState(null);
      return;
    }

    try {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then(status => {
          if (!isMounted) {
            return;
          }

          permissionStatus = status;
          // Set initial state
          setState(status.state);

          // Listen for permission changes
          handleChange = () => {
            setState(status.state);
          };

          status.addEventListener('change', handleChange);
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }
          // Permission API not supported, assume no access
          setState(null);
        });
    } catch {
      if (!isMounted) {
        return;
      }
      // Synchronous error (e.g., TypeError), assume no access
      setState(null);
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (permissionStatus && handleChange) {
        permissionStatus.removeEventListener('change', handleChange);
      }
    };
  }, [isNarrowWidth]);

  const requestPermission = async () => {
    try {
      await locationService.getCurrentPosition();
      setState('granted');
    } catch {
      // Re-query permissions state just in case
      try {
        const status = await navigator.permissions.query({
          name: 'geolocation',
        });
        setState(status.state);
      } catch {
        setState('denied');
      }
    }
  };

  return {
    isGranted: state === 'granted',
    isPending: state === 'prompt',
    requestPermission,
  };
}
