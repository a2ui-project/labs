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

import { useMemo } from 'react';

export function useCurrentWordRange(
  inputValue: string,
  cursorPosition: number | null,
) {
  return useMemo(
    () => getCurrentWordRange(inputValue, cursorPosition),
    [inputValue, cursorPosition],
  );
}

function getCurrentWordRange(
  inputValue: string,
  cursorPosition: number | null,
): [number, number] {
  if (!cursorPosition || cursorPosition < 0) return [0, 0];
  if (cursorPosition > inputValue.length) {
    return [inputValue.length, inputValue.length];
  }
  let startIdx = cursorPosition;
  const endIdx = cursorPosition;

  while (startIdx > 0 && inputValue.charAt(startIdx - 1).trim() !== '') {
    startIdx--;
  }
  if (startIdx < 0 || endIdx < 0 || startIdx === endIdx) {
    return [0, 0];
  }
  return [startIdx, endIdx];
}
