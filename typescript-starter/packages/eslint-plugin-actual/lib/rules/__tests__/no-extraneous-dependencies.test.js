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

import { runClassic } from 'eslint-vitest-rule-tester';

import plugin from '../../index';
const rule = plugin.rules['no-extraneous-dependencies'];

void runClassic(
  'no-extraneous-dependencies',
  rule,
  {
    valid: [
      // Relative imports are always allowed
      `import foo from './foo'`,
      `import foo from '../foo'`,

      // Subpath imports are always allowed
      `import foo from '#utils/foo'`,

      // Node.js built-ins are allowed (including subpaths)
      `import fs from 'fs'`,
      `import path from 'path'`,
      `import crypto from 'node:crypto'`,
      `import { readFile } from 'fs/promises'`,
      `import posix from 'path/posix'`,

      // Virtual modules are allowed
      `import { registerSW } from 'virtual:pwa-register'`,

      // require() with relative path
      `const foo = require('./foo')`,
    ],

    invalid: [
      {
        code: `import foo from 'not-a-real-package'`,
        errors: [
          {
            messageId: 'extraneous',
            data: { packageName: 'not-a-real-package' },
          },
        ],
      },
      {
        code: `import foo from '@not-real/package'`,
        errors: [
          {
            messageId: 'extraneous',
            data: { packageName: '@not-real/package' },
          },
        ],
      },
      {
        code: `import foo from '@not-real/package/deep/path'`,
        errors: [
          {
            messageId: 'extraneous',
            data: { packageName: '@not-real/package' },
          },
        ],
      },
      {
        code: `export { foo } from 'not-a-real-package'`,
        errors: [
          {
            messageId: 'extraneous',
            data: { packageName: 'not-a-real-package' },
          },
        ],
      },
      {
        code: `export * from 'not-a-real-package'`,
        errors: [
          {
            messageId: 'extraneous',
            data: { packageName: 'not-a-real-package' },
          },
        ],
      },
      {
        code: `const foo = require('not-a-real-package')`,
        errors: [
          {
            messageId: 'extraneous',
            data: { packageName: 'not-a-real-package' },
          },
        ],
      },
    ],
  },
  {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
);
