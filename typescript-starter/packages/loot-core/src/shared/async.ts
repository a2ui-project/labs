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

// oxlint-disable-next-line typescript/no-explicit-any
type AnyFunction = (...args: any[]) => any;

export function sequential<T extends AnyFunction>(
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const sequenceState: {
    running: Promise<Awaited<ReturnType<T>>> | null;
    queue: Array<{
      args: Parameters<T>;
      resolve: (
        value: Awaited<ReturnType<T>> | PromiseLike<Awaited<ReturnType<T>>>,
      ) => void;
      reject: (reason?: unknown) => void;
    }>;
  } = {
    running: null,
    queue: [],
  };

  function pump() {
    const next = sequenceState.queue.shift();
    if (next !== undefined) {
      run(next.args, next.resolve, next.reject);
    } else {
      sequenceState.running = null;
    }
  }

  function run(
    args: Parameters<T>,
    resolve: (
      value: Awaited<ReturnType<T>> | PromiseLike<Awaited<ReturnType<T>>>,
    ) => void,
    reject: (reason?: unknown) => void,
  ) {
    sequenceState.running = fn.apply(null, args).then(
      (val: Awaited<ReturnType<T>> | PromiseLike<Awaited<ReturnType<T>>>) => {
        pump();
        resolve(val);
      },
      (err: unknown) => {
        pump();
        reject(err);
      },
    );
  }

  return ((...args: Parameters<T>) => {
    if (!sequenceState.running) {
      return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
        return run(args, resolve, reject);
      });
    } else {
      return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
        sequenceState.queue.push({ resolve, reject, args });
      });
    }
  }) as T;
}

export function once<T extends AnyFunction>(
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> | null {
  let promise: Promise<Awaited<ReturnType<T>>> | null = null;
  return (...args: Parameters<T>) => {
    if (!promise) {
      promise = fn.apply(null, args).finally(() => {
        promise = null;
      });
      return promise;
    }

    return promise;
  };
}
