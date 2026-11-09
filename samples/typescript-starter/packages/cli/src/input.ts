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

import {readFileSync} from 'fs';

export function readJsonInput(cmdOpts: {data?: string; file?: string}): unknown {
  if (cmdOpts.data && cmdOpts.file) {
    throw new Error('Cannot use both --data and --file');
  }
  if (cmdOpts.data) {
    return JSON.parse(cmdOpts.data);
  }
  if (cmdOpts.file) {
    const content =
      cmdOpts.file === '-' ? readFileSync(0, 'utf-8') : readFileSync(cmdOpts.file, 'utf-8');
    return JSON.parse(content);
  }
  throw new Error('Either --data or --file is required');
}
