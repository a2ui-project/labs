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

import {repairSync as _repairSync} from './repair';
import {resetSync as _resetSync} from './reset';

import {fullSync} from '.';

export type SyncHandlers = {
  sync: typeof sync;
  'sync-reset': typeof resetSync;
  'sync-repair': typeof repairSync;
};

export const app = createApp<SyncHandlers>();
app.method('sync', sync);
app.method('sync-reset', resetSync);
app.method('sync-repair', repairSync);

async function sync() {
  return await fullSync();
}

async function resetSync() {
  return await _resetSync();
}

async function repairSync() {
  await _repairSync();
}
