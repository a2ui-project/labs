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

import {
  clearCachedUserPreferences,
  setCachedUserPreferences,
} from '#shared/formulas/customFunctions';

import {loadUserPreferencesForFormulas} from './customFunctionsPreferences';

let formulaPreferencesPromise: Promise<void> | null = null;
let formulaPreferencesCacheVersion = 0;

export function resetFormulaPreferencesCache(): void {
  formulaPreferencesCacheVersion += 1;
  formulaPreferencesPromise = null;
  clearCachedUserPreferences();
}

export function ensureFormulaPreferencesLoaded(): Promise<void> {
  const cacheVersion = formulaPreferencesCacheVersion;

  formulaPreferencesPromise ??= loadUserPreferencesForFormulas().then(prefs => {
    if (cacheVersion === formulaPreferencesCacheVersion) {
      setCachedUserPreferences(prefs);
    }
  });

  return formulaPreferencesPromise;
}
