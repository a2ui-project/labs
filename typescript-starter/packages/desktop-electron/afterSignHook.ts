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

import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

import type {AfterPackContext} from 'electron-builder';

const execFileAsync = promisify(execFile);

const afterSignHook = async (context: AfterPackContext) => {
  if (context.electronPlatformName !== 'darwin' || process.env.CSC_LINK) {
    return;
  }

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = `${context.appOutDir}/${appName}`;

  await execFileAsync('codesign', [
    '--sign',
    '-',
    '--force',
    '--preserve-metadata=entitlements,requirements,flags,runtime',
    '--deep',
    appPath,
  ]);
};

// oxlint-disable-next-line import/no-default-export
export default afterSignHook;
