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

export type Mappings = Map<string, Map<string, string>>;

export const mappingsToString = (mapping: Mappings): string =>
  JSON.stringify(
    Object.fromEntries(
      [...mapping.entries()].map(([key, value]) => [key, Object.fromEntries(value)]),
    ),
  );

export const mappingsFromString = (str: string): Mappings => {
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid mapping format');
    }
    return new Map(
      Object.entries(parsed).map(([key, value]) => [key, new Map(Object.entries(value as object))]),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : e;
    throw new Error(`Failed to parse mapping: ${String(message)}`);
  }
};

export const defaultMappings: Mappings = new Map([
  [
    'payment',
    new Map([
      ['date', 'date'],
      ['payee', 'payeeName'],
      ['notes', 'notes'],
    ]),
  ],
  [
    'deposit',
    new Map([
      ['date', 'date'],
      ['payee', 'payeeName'],
      ['notes', 'notes'],
    ]),
  ],
]);
