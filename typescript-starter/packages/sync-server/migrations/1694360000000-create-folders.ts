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

import fs from 'node:fs/promises';

import { config } from '../src/load-config';

async function ensureExists(path: string): Promise<void | null> {
  try {
    await fs.mkdir(path);
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'EEXIST') {
      return null;
    }

    throw err;
  }
}

export const up = async function (): Promise<void> {
  await ensureExists(config.get('serverFiles'));
  await ensureExists(config.get('userFiles'));
};

export const down = async function (): Promise<void> {
  await fs.rm(config.get('serverFiles'), { recursive: true, force: true });
  await fs.rm(config.get('userFiles'), { recursive: true, force: true });
};
