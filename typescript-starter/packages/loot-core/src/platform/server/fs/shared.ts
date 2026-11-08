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
import {join} from '#platform/server/fs/path-join';

let documentDir;
export const _setDocumentDir = dir => (documentDir = dir);

export const getDocumentDir = () => {
  if (!documentDir) {
    throw new Error('Document directory is not set');
  }
  return documentDir;
};

export const getBudgetDir = id => {
  if (!id) {
    throw new Error('getDocumentDir: id is falsy: ' + id);
  }

  // TODO: This should be better
  //
  // A cheesy safe guard. The id is generated from the budget name,
  // so it provides an entry point for the user to accidentally (or
  // intentionally) access other parts of the system. Always
  // restrict it to only access files within the budget directory by
  // never allowing slashes.
  if (id.match(/[^A-Za-z0-9\-_]/)) {
    throw new Error(
      `Invalid budget id "${id}". Check the id of your budget in the Advanced section of the settings page.`,
    );
  }

  return join(getDocumentDir(), id);
};
