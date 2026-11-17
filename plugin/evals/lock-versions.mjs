// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// shortcut: reads only yarn berry `yarn.lock` and `pubspec.lock`, the lock files of the two cases; add a format with a new case.
export function lockedVersions(file, text) {
  const found = new Map();
  const add = (name, version) => found.set(name, new Set([...(found.get(name) ?? []), version]));
  if (file.endsWith('pubspec.lock')) {
    for (const [, name, body] of text.matchAll(/^ {2}([\w-]+):\n((?: {4}.*\n?)*)/gm)) {
      const version = body.match(/^ {4}version: "([^"]+)"/m)?.[1];
      if (version) add(name, version);
    }
  } else {
    for (const [, name, version] of text.matchAll(/^ {2}resolution: "(@?[^@"]+)@npm:([^"]+)"/gm))
      add(name, version);
  }
  return found;
}

export function problems(found, wanted) {
  return wanted.flatMap(pair => {
    const [name, version] = pair.split(/=(?=[^=]*$)/);
    const versions = [...(found.get(name) ?? [])];
    return versions.length === 1 && versions[0] === version
      ? []
      : [
          `${name}: the lock file has ${versions.join(', ') || 'no version'}. The case pins ${version}.`,
        ];
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, ...wanted] = process.argv.slice(2);
  if (!file || wanted.length === 0) {
    console.error('Usage: node lock-versions.mjs <lock file> <package>=<version> ...');
    process.exit(2);
  }
  const bad = problems(lockedVersions(file, fs.readFileSync(file, 'utf8')), wanted);
  for (const line of bad) console.error(line);
  if (bad.length === 0) console.log(`${file}: ${wanted.join(', ')}`);
  process.exit(bad.length === 0 ? 0 : 1);
}
