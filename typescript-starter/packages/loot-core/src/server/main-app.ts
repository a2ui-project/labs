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

import * as connection from '#platform/server/connection';
import type {Handlers} from '#types/handlers';

import {createApp} from './app';
import {runHandler} from './mutators';

// Main app
export const app = createApp<Handlers>();

app.events.on('sync', event => {
  connection.send('sync-event', event);
});

/**
 * Run a handler by name (server-side). Same API shape as the client connection's send.
 * Used by server code that needs to invoke handlers directly, e.g. importers.
 */
export async function send<K extends keyof Handlers>(
  name: K,
  args?: Parameters<Handlers[K]>[0],
): Promise<Awaited<ReturnType<Handlers[K]>>> {
  return runHandler(app.handlers[name], args, {name}) as Promise<Awaited<ReturnType<Handlers[K]>>>;
}
