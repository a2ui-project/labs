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
import { captureException } from '#platform/exceptions';
import { logger } from '#platform/server/log';
import { APIError } from '#server/errors';
import { isMutating, runHandler } from '#server/mutators';

import { postErrorReply } from './errors';
import type * as T from './index-types';

export const init: T.Init = function (_socketName, handlers) {
  process.parentPort.on('message', ({ data }) => {
    const { id, name, args, undoTag, catchErrors } = data;

    if (handlers[name]) {
      runHandler(handlers[name], args, { undoTag, name }).then(
        result => {
          if (catchErrors) {
            result = { data: result, error: null };
          }

          process.parentPort.postMessage({
            type: 'reply',
            id,
            result,
            mutated:
              isMutating(handlers[name]) && name !== 'undo' && name !== 'redo',
            undoTag,
          });
        },
        nativeError => {
          const error = postErrorReply(
            message => process.parentPort.postMessage(message),
            { id, name, catchErrors },
            nativeError,
          );

          if (error.type === 'ServerError' && name !== 'api/load-budget') {
            captureException(nativeError);
          }

          if (!catchErrors) {
            // Notify the frontend that something bad happend
            send('server-error');
          }
        },
      );
    } else {
      logger.error('Unknown server method: ' + name);
      captureException(new Error('Unknown server method: ' + name));
      const unknownMethodError = APIError('Unknown server method: ' + name);

      if (catchErrors) {
        process.parentPort.postMessage({
          type: 'reply',
          id,
          result: { error: unknownMethodError, data: null },
        });
      } else {
        process.parentPort.postMessage({
          type: 'error',
          id,
          error: unknownMethodError,
        });
      }
    }
  });
};

export const getNumClients: T.GetNumClients = function () {
  return 0;
};

export const send: T.Send = function (name, args) {
  process.parentPort.postMessage({ type: 'push', name, args });
};

export const resetEvents: T.ResetEvents = function () {
  // resetEvents is used in tests to mock the server
};
