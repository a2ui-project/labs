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

import {createApp} from '#server/app';
import * as sheet from '#server/sheet';
import type {QueryState} from '#shared/query';

import {resolveName, unresolveName} from './util';

export type SpreadsheetHandlers = {
  'get-cell': typeof getCell;
  'get-cell-names': typeof getCellNames;
  'create-query': typeof createQuery;
};

// Expose functions to the client
export const app = createApp<SpreadsheetHandlers>();
app.method('get-cell', getCell);
app.method('get-cell-names', getCellNames);
app.method('create-query', createQuery);

async function getCell({sheetName, name}: {sheetName: string; name: string}) {
  const node = sheet.get()._getNode(resolveName(sheetName, name));
  return {name: node.name, value: node.value};
}

async function getCellNames({sheetName}: {sheetName: string}) {
  const names = [];
  for (const name of sheet.get().getNodes().keys()) {
    const {sheet: nodeSheet, name: nodeName} = unresolveName(name);
    if (nodeSheet === sheetName) {
      names.push(nodeName);
    }
  }
  return names;
}

async function createQuery({
  sheetName,
  name,
  query,
}: {
  sheetName: string;
  name: string;
  query: QueryState;
}) {
  // Always run it regardless of cache. We don't know anything has changed
  // between the cache value being saved and now
  sheet.get().createQuery(sheetName, name, query);
  return 'ok';
}
