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
import type {RefObject} from 'react';

import type {Falsy} from '@actual-app/core/types/util';

import {addItems, setContextMenuPosition} from '#contextmenu/contextMenuSlice';
import type {ContextMenuItem} from '#contextmenu/types';
import {useRefEventListener} from '#hooks/useRefEventListener';
import {useDispatch} from '#redux';

type UseContextMenuProps = {
  triggerRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
  items: Falsy<ContextMenuItem>[];
};

export function useContextMenu({triggerRef, enabled = true, items}: UseContextMenuProps) {
  const dispatch = useDispatch();

  const processedItems = items.filter(
    item => item && (typeof item === 'symbol' || !item.hidden),
  ) as ContextMenuItem[];

  useRefEventListener(triggerRef, 'contextmenu', (e: MouseEvent) => {
    if (enabled) {
      e.preventDefault();
      dispatch(addItems(processedItems));
      dispatch(setContextMenuPosition({x: e.clientX, y: e.clientY}));
    }
  });

  const handleContextMenu = useCallback(() => {
    if (!triggerRef.current || !enabled) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // prefer MouseEvent bubbling over dispatching events to
    // allow nesting context menu actions
    triggerRef.current.dispatchEvent(
      new MouseEvent('contextmenu', {
        clientX: rect.x,
        clientY: rect.y + rect.height,
        bubbles: true,
      }),
    );
  }, [triggerRef, enabled]);

  return {handleContextMenu};
}
