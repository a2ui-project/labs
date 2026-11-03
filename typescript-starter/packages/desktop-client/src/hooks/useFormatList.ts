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
import type { ReactNode } from 'react';

const interleaveArrays = (...arrays: ReactNode[][]) =>
  Array.from(
    {
      length: Math.max(...arrays.map(array => array.length)),
    },
    (_, i) => arrays.map(array => array[i]),
  ).flat();

export function useFormatList(values: ReactNode[], lng: string, opt = {}) {
  const formatter = useMemo(
    () =>
      new Intl.ListFormat(lng, {
        style: 'long',
        type: 'conjunction',
        ...opt,
      }),
    [lng, opt],
  );

  const parts = useMemo(() => {
    const placeholders = Array.from(
      { length: values.length },
      (_, i) => `<${i}>`,
    );
    const formatted = formatter.format(placeholders);
    return formatted.split(/<\d+>/g);
  }, [values.length, formatter]);

  return interleaveArrays(parts, values);
}
