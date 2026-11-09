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

/**
 * Returns a callback ref that calls `drag(element)` when the DOM node is attached.
 * @see https://github.com/react-dnd/react-dnd/issues/3655#issuecomment-2578808024
 */
export function useDragRef(drag: (el: HTMLDivElement) => void) {
  return useCallback(
    (element: HTMLDivElement | null) => {
      if (element) {
        drag(element);
      }
    },
    [drag],
  );
}
