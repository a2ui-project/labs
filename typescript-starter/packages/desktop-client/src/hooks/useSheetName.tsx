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

// @ts-strict-ignore
import {createContext, useContext} from 'react';
import type {PropsWithChildren} from 'react';

import type {Binding, SheetFields, SheetNames} from '#spreadsheet';

function unresolveName(name) {
  const idx = name.indexOf('!');
  if (idx !== -1) {
    return {
      sheet: name.slice(0, idx),
      name: name.slice(idx + 1),
    };
  }
  return {sheet: null, name};
}

const SheetNameContext = createContext<string | undefined>(undefined);

type SheetNameProviderProps = PropsWithChildren<{name: string}>;

export function SheetNameProvider({children, name}: SheetNameProviderProps) {
  return <SheetNameContext.Provider value={name}>{children}</SheetNameContext.Provider>;
}

export function useSheetName<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>(binding: Binding<SheetName, FieldName>) {
  if (!binding) {
    throw new Error('Sheet binding is required');
  }

  const isStringBinding = typeof binding === 'string';

  let bindingName: string = isStringBinding ? binding : binding.name;

  if (global.IS_TESTING && !isStringBinding && !bindingName) {
    bindingName = binding.value.toString();
  }

  if (bindingName == null) {
    throw new Error('Binding name is now required');
  }

  // Get the current sheet name, and unresolve the binding name if
  // necessary (you might pass a fully resolved name like foo!name)
  let sheetName = useContext(SheetNameContext) || '__global';
  const unresolved = unresolveName(bindingName);
  if (unresolved.sheet) {
    sheetName = unresolved.sheet;
    bindingName = unresolved.name;
  }

  return {
    sheetName,
    bindingName,
    fullSheetName: `${sheetName}!${bindingName}`,
  };
}
