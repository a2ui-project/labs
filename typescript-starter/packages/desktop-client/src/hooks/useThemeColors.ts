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

import { theme } from '@actual-app/components/theme';

const VAR_STRING_REGEX = /^var\((--.*)\)$/;

function getPropertyValueFromVarString(varString: string): string {
  if (VAR_STRING_REGEX.test(varString)) {
    const match = varString.match(VAR_STRING_REGEX);
    if (match) {
      return window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(match[1])
        .trim();
    }
  }
  return varString;
}

export function useThemeColors(): Record<string, string> {
  return useMemo(() => {
    const colors: Record<string, string> = {};

    for (const [key, value] of Object.entries(theme)) {
      const computedValue = getPropertyValueFromVarString(value);
      if (computedValue) {
        colors[key] = computedValue;
      }
    }

    return colors;
  }, []);
}
