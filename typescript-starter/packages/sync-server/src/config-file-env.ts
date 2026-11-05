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

import fs from 'node:fs';

/** Minimal shape of a convict config; avoids depending on convict's types. */
type ConfigSchema = {
  set(path: string, value: unknown): unknown;
};

/**
 * Reads the value of a `<VAR>_FILE` environment variable, returning the
 * contents of the file it points at and throwing if the file is not accessible.
 */
export function readFileEnv(
  fileEnvVar: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const filePath = env[fileEnvVar];

  if (filePath === undefined) return undefined;

  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read ${fileEnvVar} from '${filePath}': ${reason}`);
  }
}

/**
 * Applies a `<VAR>_FILE` override onto a convict setting, returning whether
 * one was applied.
 */
export function applyFileEnv(
  config: ConfigSchema,
  fileEnvVar: string,
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const value = readFileEnv(fileEnvVar, env);

  if (value === undefined) return false;

  config.set(path, value);

  return true;
}
