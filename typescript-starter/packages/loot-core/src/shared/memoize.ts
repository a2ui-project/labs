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

type EqualityFn = (newArgs: unknown[], lastArgs: unknown[]) => boolean;

function areInputsEqual(newArgs: unknown[], lastArgs: unknown[]): boolean {
  if (newArgs.length !== lastArgs.length) {
    return false;
  }
  for (let i = 0; i < newArgs.length; i++) {
    if (!Object.is(newArgs[i], lastArgs[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Minimal drop-in replacement for the `memoize-one` package: caches the result
 * of the most recent call and returns it again when called with equal arguments
 * (shallow equality by default), preserving referential stability of the result.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export function memoizeOne<Args extends any[], Result>(
  fn: (...args: Args) => Result,
  isEqual: EqualityFn = areInputsEqual,
): (...args: Args) => Result {
  let cache: {args: Args; result: Result} | null = null;

  return function (this: unknown, ...args: Args): Result {
    if (cache && isEqual(args, cache.args)) {
      return cache.result;
    }
    const result = fn.apply(this, args);
    cache = {args, result};
    return result;
  };
}
