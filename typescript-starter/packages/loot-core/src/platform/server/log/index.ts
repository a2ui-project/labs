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

let verboseMode = true;

export function setVerboseMode(verbose: boolean) {
  verboseMode = verbose;
}

export function isVerboseMode(): boolean {
  return verboseMode;
}

export const logger = {
  info: (...args: unknown[]) => {
    if (verboseMode) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  log: (...args: unknown[]) => {
    if (verboseMode) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (verboseMode) {
      console.debug(...args);
    }
  },
  group: (...args: unknown[]) => {
    if (verboseMode) {
      console.group(...args);
    }
  },
  groupEnd: () => {
    if (verboseMode) {
      console.groupEnd();
    }
  },
};
