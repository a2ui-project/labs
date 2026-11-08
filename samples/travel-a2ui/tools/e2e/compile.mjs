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

/**
 * Compiles canned Express with the A2UI SDK, through `compile.py`.
 *
 * One Python process per call, so a suite compiles all its fixtures at once.
 * `PYTHON` picks the interpreter (a venv's, usually), as the other suites do.
 */

import {execFileSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** `[{surfaceId, source, partialAt?}]` → `[{messages, partial}]`, in order. */
export function compileAll(fixtures) {
  const output = execFileSync(process.env.PYTHON ?? 'python3', ['tools/e2e/compile.py'], {
    cwd: root,
    input: JSON.stringify(fixtures),
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(String(output));
}
