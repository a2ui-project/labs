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

// `postMessage` payloads must be structured-cloneable; errors from wasm code
// are not always (e.g. Emscripten filesystem errors carry function properties)
// and a failed clone masks the real error.

export type Message = { type: string; id?: string } & Record<string, unknown>;

export function serializeError(error: unknown): Record<string, unknown> {
  if (error == null || typeof error !== 'object') {
    return { name: 'Error', message: String(error) };
  }

  const errorObject = error as Record<string, unknown>;
  const plain: Record<string, unknown> = {
    name: typeof errorObject.name === 'string' ? errorObject.name : 'Error',
    message:
      typeof errorObject.message === 'string'
        ? errorObject.message
        : String(error),
  };
  if (typeof errorObject.stack === 'string') {
    plain.stack = errorObject.stack;
  }

  for (const key of Object.keys(errorObject)) {
    if (key === 'name' || key === 'message' || key === 'stack') {
      continue;
    }
    const value = errorObject[key];
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      plain[key] = value;
    }
  }
  return plain;
}

function errorReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return serializeError(value);
  }
  return value;
}

export function safePost(post: (msg: unknown) => void, msg: Message): void {
  try {
    post(msg);
  } catch (postError) {
    try {
      post(JSON.parse(JSON.stringify(msg, errorReplacer)));
    } catch {
      try {
        post({
          type: 'error',
          id: msg.id,
          error: {
            type: 'ServerError',
            message:
              'Failed to serialize server response: ' +
              (postError instanceof Error
                ? postError.message
                : String(postError)),
          },
        });
      } catch {
        // The channel itself is broken; there is no way to report anything
      }
    }
  }
}
