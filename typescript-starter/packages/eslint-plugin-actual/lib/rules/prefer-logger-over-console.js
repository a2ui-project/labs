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

const path = require('path');

const { ensureImport } = require('../utils/import-helpers');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Replace console.log/warn/error calls with logger in loot-core files',
    },
    fixable: 'code',
    schema: [],
    messages: {
      preferLogger: 'Use logger.{{method}} instead of console.{{method}}',
    },
  },

  createOnce(context) {
    let normalizedFilename;

    const methodMap = {
      log: 'log',
      warn: 'warn',
      error: 'error',
      info: 'info',
      debug: 'debug',
      group: 'group',
      groupEnd: 'groupEnd',
    };

    function getLoggerImportPath() {
      const loggerPath = 'packages/loot-core/src/platform/server/log';
      const fileDir = path.dirname(normalizedFilename);
      const relativePath = path.posix.relative(fileDir, loggerPath);
      return relativePath || './log';
    }

    function getLoggerImportInfo() {
      const { ast } = context.sourceCode;
      const importPath = getLoggerImportPath();

      for (const node of ast.body) {
        if (
          node.type === 'ImportDeclaration' &&
          typeof node.source.value === 'string' &&
          (node.source.value === importPath ||
            node.source.value.includes('platform/server/log'))
        ) {
          const spec = node.specifiers.find(
            s => s.type === 'ImportSpecifier' && s.imported.name === 'logger',
          );
          if (spec) {
            return { decl: node, localName: spec.local.name };
          }
        }
      }
      return { decl: null, localName: null };
    }

    return {
      before() {
        normalizedFilename = context.filename.replace(/\\/g, '/');
        const isLootCoreFile = normalizedFilename.match(
          /packages\/loot-core\/src\/(server|shared|platform)/,
        );
        if (
          !isLootCoreFile ||
          normalizedFilename.includes(
            'packages/loot-core/src/platform/server/log/index.ts',
          )
        ) {
          return false;
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'console' &&
          node.callee.property.type === 'Identifier' &&
          methodMap.hasOwnProperty(node.callee.property.name)
        ) {
          const method = node.callee.property.name;

          context.report({
            node,
            messageId: 'preferLogger',
            data: { method },
            fix(fixer) {
              const sourceCode = context.sourceCode;
              const { localName } = getLoggerImportInfo();
              const loggerIdent = localName || 'logger';
              const fixes = [
                fixer.replaceText(
                  node.callee,
                  `${loggerIdent}.${methodMap[method]}`,
                ),
              ];

              const importPath = getLoggerImportPath();
              if (!localName) {
                ensureImport(fixes, sourceCode, fixer, 'logger', importPath);
              }

              return fixes;
            },
          });
        }
      },
    };
  },
};
