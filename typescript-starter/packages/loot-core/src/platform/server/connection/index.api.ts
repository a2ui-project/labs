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

import {logger} from '#platform/server/log';
import type {ServerEvents} from '#types/server-events';

import type * as T from './index-types';

export const init: T.Init = function () {
  // Nothing
};

// The API has no UI for server events; the two below mean synced data is
// parked on (or lost from) this device, so surface them to the script author
export const send: T.Send = function (type, args) {
  if (type !== 'sync-event' || !args) {
    return;
  }
  const event = args as ServerEvents['sync-event'];
  if (event.type === 'deferred-messages') {
    logger.warn(
      'Some synced changes were made with a newer version of Actual and will apply once @actual-app/api is updated',
    );
  } else if (event.type === 'dropped-messages') {
    logger.warn(
      'Some changes made on another device could not be applied on this device, so your data may differ',
    );
  }
};

export const getNumClients: T.GetNumClients = function () {
  return 1;
};
