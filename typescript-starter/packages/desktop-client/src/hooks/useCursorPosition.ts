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

import {useRefEventListener} from './useRefEventListener';

export function useCursorPosition(
  ref: RefObject<HTMLInputElement | null>,
): [number | null, (n: number | null) => void] {
  const doc = useRef(document);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  const update = () => {
    if (!ref.current || !document.hasFocus()) return;
    setCursorPosition(document.activeElement === ref.current ? ref.current.selectionStart : null);
  };
  useRefEventListener(ref, 'focusin', update);
  useRefEventListener(ref, 'keyup', update);
  useRefEventListener(doc, 'selectionchange', update);
  useEffect(update, [ref, setCursorPosition]); // sync on mount

  const clear = () => {
    if (document.hasFocus()) {
      setCursorPosition(null);
    }
  };
  useRefEventListener(ref, 'focusout', clear);

  return [
    cursorPosition,
    (n: number | null) =>
      setTimeout(() => {
        ref.current?.setSelectionRange(n, n);
        document.dispatchEvent(new Event('selectionchange'));
      }),
  ];
}
