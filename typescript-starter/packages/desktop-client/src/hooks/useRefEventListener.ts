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

import {useEffect, useRef, useState} from 'react';
import type {RefObject} from 'react';

export function useRefEventListener<
  ElementType extends EventTarget,
  EventType extends keyof HTMLElementEventMap,
>(
  ref: RefObject<ElementType | null> | Document | Window,
  event: EventType,
  // oxlint-disable-next-line typescript/no-explicit-any
  callback: (this: ElementType, ev: HTMLElementEventMap[EventType]) => any,
) {
  // Keep the latest callback in a ref so the effect below doesn't need to
  // depend on it. Callers routinely pass a new inline function every render,
  // which would otherwise tear down and re-add the native listener on every
  // render instead of only when the target element or `event` change.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // Mutating `ref.current` doesn't re-run effects, so the element can't go in
  // a dependency array. Re-resolve it after every render and mirror it into
  // state; `setTarget` bails out when the element hasn't moved.
  const [target, setTarget] = useState<EventTarget | null>(null);
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- must run every render; the bail-out stops the update chain
  useEffect(() => {
    setTarget(ref instanceof Document || ref instanceof Window ? ref : ref.current);
  });

  useEffect(() => {
    if (!target) return;

    const listener: EventListener = e =>
      callbackRef.current.call(target as ElementType, e as HTMLElementEventMap[EventType]);
    target.addEventListener(event, listener);
    return () => {
      target.removeEventListener(event, listener);
    };
  }, [target, event]);
}
