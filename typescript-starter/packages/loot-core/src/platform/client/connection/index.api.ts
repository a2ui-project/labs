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

import { lib } from '#server/main';
import type { Handlers } from '#types/handlers';

import type * as T from './index-types';

// In-process client for the api/node platform.
export const send = (async <K extends keyof Handlers>(
  name: K,
  args?: Parameters<Handlers[K]>[0],
  options?: { catchErrors?: boolean },
) => {
  if (options?.catchErrors) {
    try {
      return { data: await lib.send(name, args), error: undefined };
    } catch (error) {
      return { data: undefined, error };
    }
  }
  return lib.send(name, args);
}) as T.Send;
