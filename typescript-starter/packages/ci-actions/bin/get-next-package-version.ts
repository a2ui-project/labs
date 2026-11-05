#!/usr/bin/env node
/**
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

// This script is used in GitHub Actions to get the next version based on the current package.json version.
// It supports three types of versioning: nightly, hotfix, and monthly.
import fs from 'node:fs';
import {parseArgs} from 'node:util';

import {getNextVersion, isValidVersionType} from '../src/versions/get-next-package-version';

const options = {
  'package-json': {
    type: 'string',
    short: 'p',
  },
  type: {
    type: 'string', // nightly, hotfix, monthly, auto
    short: 't',
  },
  version: {
    type: 'string',
    short: 'v',
  },
  update: {
    type: 'boolean',
    short: 'u',
    default: false,
  },
} as const;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const {values} = parseArgs({
  options,
  allowPositionals: true,
});

const packageJsonPath = values['package-json'];
if (!packageJsonPath) {
  fail('Please specify the path to package.json using --package-json or -p option.');
}

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (!('version' in packageJson) || typeof packageJson.version !== 'string') {
    fail('The specified package.json does not contain a valid version field.');
  }

  const currentVersion = packageJson.version;

  const explicitVersion = values.version;
  let newVersion;

  if (explicitVersion) {
    newVersion = explicitVersion;
  } else {
    const type = values.type;
    if (!type || !isValidVersionType(type)) {
      fail('Please specify the release type using --type or -t.');
    }

    try {
      newVersion = getNextVersion({
        currentVersion,
        type,
        currentDate: new Date(),
      });
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  }

  process.stdout.write(newVersion);

  if (process.env.GITHUB_OUTPUT) {
    const resolvedType = newVersion.includes('-nightly.')
      ? 'nightly'
      : newVersion.split('.')[2] === '0'
        ? 'monthly'
        : 'hotfix';
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${newVersion}\ntype=${resolvedType}\n`);
  }

  if (values.update) {
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  }
} catch (error) {
  fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
}
