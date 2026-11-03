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

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer subpath imports (#path/to/module) over relative backtracked imports (../path/to/module)',
    },
    fixable: 'code',
    schema: [],
    messages: {
      preferSubpathImport:
        'Use subpath import "{{subpath}}" instead of relative import "{{original}}"',
    },
  },

  createOnce(context) {
    let normalizedFilename;
    let srcDir;

    function getSubpathImport(importSource) {
      // Only transform backtracked imports
      if (!importSource.startsWith('../')) {
        return null;
      }

      const fileDir = path.dirname(normalizedFilename);
      const resolved = path.posix.join(fileDir, importSource);

      // Check that the resolved path is inside src/
      const srcRoot = srcDir.slice(0, -1);
      const relativeToSrc = path.posix.relative(srcRoot, resolved);
      if (
        relativeToSrc === '' ||
        relativeToSrc.startsWith('..') ||
        path.posix.isAbsolute(relativeToSrc)
      ) {
        return null;
      }

      // Get path relative to src/
      let subpath = relativeToSrc;

      // Strip file extensions
      subpath = subpath.replace(/\.(ts|tsx|js|jsx)$/, '');

      // Strip trailing /index
      subpath = subpath.replace(/\/index$/, '');

      return '#' + subpath;
    }

    function checkAndReport(node, source) {
      if (!source || typeof source.value !== 'string') return;

      const subpath = getSubpathImport(source.value);
      if (!subpath) return;

      context.report({
        node: source,
        messageId: 'preferSubpathImport',
        data: {
          subpath,
          original: source.value,
        },
        fix(fixer) {
          const raw = source.raw;
          const quote = raw[0];
          return fixer.replaceText(source, `${quote}${subpath}${quote}`);
        },
      });
    }

    return {
      before() {
        normalizedFilename = context.filename.replace(/\\/g, '/');
        const pkgMatch = normalizedFilename.match(/packages\/[^/]+\/src\//);
        if (!pkgMatch) return false;
        srcDir = normalizedFilename.slice(
          0,
          pkgMatch.index + pkgMatch[0].length,
        );
      },
      ImportDeclaration(node) {
        checkAndReport(node, node.source);
      },
      ExportNamedDeclaration(node) {
        checkAndReport(node, node.source);
      },
      ExportAllDeclaration(node) {
        checkAndReport(node, node.source);
      },
    };
  },
};
