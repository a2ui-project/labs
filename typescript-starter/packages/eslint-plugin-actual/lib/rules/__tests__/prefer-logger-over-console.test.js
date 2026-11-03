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
const rule = plugin.rules['prefer-logger-over-console'];

void runClassic(
  'prefer-logger-over-console',
  rule,
  {
    valid: [
      {
        code: 'console.log("test");',
        filename: 'packages/some-other-package/src/file.js',
      },
      {
        code: 'logger.log("test");',
        filename: 'packages/loot-core/src/server/test.ts',
      },
    ],
    invalid: [
      {
        code: 'console.log("test");',
        filename: 'packages/loot-core/src/server/test.ts',
        output: `import { logger } from '../platform/server/log';

logger.log("test");`,
        errors: [
          {
            messageId: 'preferLogger',
            data: { method: 'log' },
          },
        ],
      },
      {
        code: 'console.warn("warning");',
        filename: 'packages/loot-core/src/server/test.ts',
        output: `import { logger } from '../platform/server/log';

logger.warn("warning");`,
        errors: [
          {
            messageId: 'preferLogger',
            data: { method: 'warn' },
          },
        ],
      },
      {
        code: 'console.error("error");',
        filename: 'packages/loot-core/src/server/test.ts',
        output: `import { logger } from '../platform/server/log';

logger.error("error");`,
        errors: [
          {
            messageId: 'preferLogger',
            data: { method: 'error' },
          },
        ],
      },
      {
        code: 'console.info("info");',
        filename: 'packages/loot-core/src/server/test.ts',
        output: `import { logger } from '../platform/server/log';

logger.info("info");`,
        errors: [
          {
            messageId: 'preferLogger',
            data: { method: 'info' },
          },
        ],
      },
      {
        code: 'console.debug("debug");',
        filename: 'packages/loot-core/src/server/test.ts',
        output: `import { logger } from '../platform/server/log';

logger.debug("debug");`,
        errors: [
          {
            messageId: 'preferLogger',
            data: { method: 'debug' },
          },
        ],
      },
      {
        code: 'console.group("Group Name");',
        filename: 'packages/loot-core/src/server/test.ts',
        output: `import { logger } from '../platform/server/log';

logger.group("Group Name");`,
        errors: [
          {
            messageId: 'preferLogger',
            data: { method: 'group' },
          },
        ],
      },
      {
        code: 'console.groupEnd();',
        filename: 'packages/loot-core/src/server/test.ts',
        output: `import { logger } from '../platform/server/log';

logger.groupEnd();`,
        errors: [
          {
            messageId: 'preferLogger',
            data: { method: 'groupEnd' },
          },
        ],
      },
      {
        code: 'console.log("test");',
        filename: 'packages/loot-core/src/server/sync/test.ts',
        output: `import { logger } from '../../platform/server/log';

logger.log("test");`,
        errors: [
          {
            messageId: 'preferLogger',
            data: { method: 'log' },
          },
        ],
      },
      {
        code: `import { setVerboseMode } from '../platform/server/log';
console.log("test");`,
        filename: 'packages/loot-core/src/server/test.ts',
        output: `import { setVerboseMode, logger } from '../platform/server/log';
logger.log("test");`,
        errors: [
          {
            messageId: 'preferLogger',
            data: { method: 'log' },
          },
        ],
      },
      {
        code: `import { logger as log } from '../platform/server/log';
console.log("test");`,
        filename: 'packages/loot-core/src/server/test.ts',
        output: `import { logger as log } from '../platform/server/log';
log.log("test");`,
        errors: [
          {
            messageId: 'preferLogger',
            data: { method: 'log' },
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
