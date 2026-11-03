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

import { useEffect, useEffectEvent, useRef } from 'react';

type UseOnVisibleOptions = {
  /** When false, the visibility listener is not attached. Default true. */
  isEnabled?: boolean;
};

/**
 * Runs the given callback when the document becomes visible (e.g. user
 * switches back to the tab). Uses a guard so the callback is not invoked
 * again until the previous invocation has finished (handles async callbacks).
 */
export function useOnVisible(
  callback: () => void | Promise<void>,
  options: UseOnVisibleOptions = {},
) {
  const { isEnabled = true } = options;
  const inProgress = useRef(false);

  const runCallback = useEffectEvent(async () => {
    if (inProgress.current) {
      return;
    }
    inProgress.current = true;
    try {
      await callback();
    } finally {
      inProgress.current = false;
    }
  });

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') {
        return;
      }
      void runCallback();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isEnabled]);
}
