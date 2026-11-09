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

import type {GlobalPrefsJson} from '#types/prefs';

export declare function init(opts?: {persist?: boolean}): void;
export type Init = typeof init;

export declare function getItem<K extends keyof GlobalPrefsJson>(
  key: K,
): Promise<GlobalPrefsJson[K]>;
export type GetItem = typeof getItem;

export declare function setItem<K extends keyof GlobalPrefsJson>(
  key: K,
  value: GlobalPrefsJson[K],
): Promise<void>;
export type SetItem = typeof setItem;

export declare function removeItem(key: keyof GlobalPrefsJson): Promise<void>;
export type RemoveItem = typeof removeItem;

export declare function multiGet<K extends readonly (keyof GlobalPrefsJson)[]>(
  keys: K,
): Promise<{[P in K[number]]: GlobalPrefsJson[P]}>;

export type MultiGet = typeof multiGet;

export declare function multiSet<K extends keyof GlobalPrefsJson>(
  keyValues: Array<[K, GlobalPrefsJson[K]]>,
): Promise<void>;

export type MultiSet = typeof multiSet;

export declare function multiRemove(keys: (keyof GlobalPrefsJson)[]): Promise<void>;
export type MultiRemove = typeof multiRemove;
