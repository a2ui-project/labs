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

import { init as initLootCore } from '@actual-app/core/server/main';
import type { InitConfig, lib } from '@actual-app/core/server/main';

import { validateNodeVersion } from './validateNodeVersion';

export * from './methods';
export * as utils from './utils';

/** @deprecated Please use return value of `init` instead */
export let internal: typeof lib | null = null;

export async function init(config: InitConfig = {}) {
  validateNodeVersion();

  internal = await initLootCore(config);
  return internal;
}

export async function shutdown() {
  if (internal) {
    try {
      await internal.send('sync');
    } catch {
      // most likely that no budget is loaded, so the sync failed
    }

    await internal.send('close-budget');
    internal = null;
  }
}
