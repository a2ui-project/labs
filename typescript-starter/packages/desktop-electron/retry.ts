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

// Local copy of loot-core's `#shared/retry` helper. The Electron main process
// loads compiled JS at runtime and cannot import loot-core's TS source, so the
// (tiny) helper is duplicated here to avoid pulling in the `promise-retry`
// dependency.

type RetryCallback = (error?: unknown) => void;

type RetryOptions = {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  factor?: number;
};

class RetrySignal {
  constructor(readonly error: unknown) {}
}

export function retry<T>(
  fn: (retry: RetryCallback, attempt: number) => Promise<T>,
  {retries = 10, minTimeout = 1000, maxTimeout = Infinity, factor = 2}: RetryOptions = {},
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let attempt = 0;

    const onRetry: RetryCallback = error => {
      throw new RetrySignal(error);
    };

    const run = () => {
      attempt += 1;
      Promise.resolve()
        .then(() => fn(onRetry, attempt))
        .then(resolve, error => {
          if (!(error instanceof RetrySignal)) {
            reject(error);
            return;
          }
          if (attempt > retries) {
            reject(error.error);
            return;
          }
          const timeout = Math.min(minTimeout * factor ** (attempt - 1), maxTimeout);
          setTimeout(run, timeout);
        });
    };

    run();
  });
}
