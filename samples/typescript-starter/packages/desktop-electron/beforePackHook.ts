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

import {rebuild} from '@electron/rebuild';
import copyFiles from 'copyfiles';
import {Arch} from 'electron-builder';
import type {AfterPackContext} from 'electron-builder';

/* The beforePackHook runs before packing the Electron app for an architecture
We hook in here to build anything architecture dependent - such as beter-sqlite3
To build, we call @electron/rebuild on the better-sqlite3 module */
const beforePackHook = async (context: AfterPackContext) => {
  const arch: string = Arch[context.arch];
  const buildPath = context.packager.projectDir;
  const projectRootPath = buildPath + '/../../';
  const electronVersion = context.packager.config.electronVersion;

  if (!electronVersion) {
    console.error('beforePackHook: Unable to find electron version.');
    process.exit(1); // End the process - electron version is required
  }

  // gyp always compiles with CC_target/CXX_target when they are set, so they
  // must only point at the cross-compiler while building for a foreign
  // architecture — leaving them set would cross-compile the host-arch pass too.
  if (process.platform === 'linux' && arch === 'arm64') {
    process.env.CC_target = 'aarch64-linux-gnu-gcc';
    process.env.CXX_target = 'aarch64-linux-gnu-g++';
  } else {
    delete process.env.CC_target;
    delete process.env.CXX_target;
  }

  try {
    // needed for better-sqlite3 because prebuilts are needed for each arch
    process.env.npm_config_force_build = '1';

    await rebuild({
      arch,
      buildPath,
      electronVersion,
      force: true,
      projectRootPath,
      onlyModules: ['better-sqlite3', 'bcrypt', 'argon2'],
    });

    console.info(`Rebuilt better-sqlite3, bcrypt, and argon2 with ${arch}!`);

    if (context.packager.platform.name === 'windows') {
      console.info(`Windows build - copying appx files...`);

      await new Promise(resolve => copyFiles(['./appx/**/*', './build'], {error: true}, resolve));

      console.info(`Copied appx files!`);
    }
  } catch (err) {
    console.error('beforePackHook:', err);
    process.exit(1); // End the process - unsuccessful build
  }
};

// oxlint-disable-next-line import/no-default-export
export default beforePackHook;
