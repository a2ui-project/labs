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

export type EmptyObject = Record<never, never>;

export type StripNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};

export type EverythingButIdOptional<T extends { id: unknown }> = {
  id: T['id'];
} & Partial<Omit<T, 'id'>>;

export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type WithOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// Allows use of object literals inside child elements of `Trans` tags
// see https://github.com/i18next/react-i18next/issues/1483
// oxlint-disable-next-line typescript/no-explicit-any
export type TransObjectLiteral = any;

export type AtLeastOne<T extends Record<string, unknown>> =
  keyof T extends infer K
    ? K extends string
      ? Pick<T, K & keyof T> & Partial<T>
      : never
    : never;

export type Falsy<T> = T | undefined | null | false | '' | 0 | -0 | 0n;
