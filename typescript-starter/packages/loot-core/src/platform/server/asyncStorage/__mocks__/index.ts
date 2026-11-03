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

import type * as T from '#platform/server/asyncStorage/index-types';
// @ts-strict-ignore
import type { GlobalPrefsJson } from '#types/prefs';

const store: GlobalPrefsJson = {};

export const init: T.Init = function () {
  // No need to initialise in tests
};

export const getItem: T.GetItem = async function (key) {
  return store[key];
};

export const setItem: T.SetItem = async function (key, value) {
  store[key] = value;
};

export const removeItem: T.RemoveItem = async function (key) {
  delete store[key];
};

export async function multiGet<K extends readonly (keyof GlobalPrefsJson)[]>(
  keys: K,
): Promise<{ [P in K[number]]: GlobalPrefsJson[P] }> {
  const results = keys.map(key => [key, store[key]]) as {
    [P in keyof K]: [K[P], GlobalPrefsJson[K[P]]];
  };

  // Convert the array of tuples to an object with properly typed properties
  return results.reduce(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {} as { [P in K[number]]: GlobalPrefsJson[P] },
  );
}

export const multiSet: T.MultiSet = async function (keyValues) {
  keyValues.forEach(function ([key, value]) {
    store[key] = value;
  });
};

export const multiRemove: T.MultiRemove = async function (keys) {
  keys.forEach(function (key) {
    delete store[key];
  });
};
