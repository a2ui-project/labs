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

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Forbid TypeScript enum declarations in favor of objects or maps',
    },
    fixable: null,
    schema: [],
    messages: {
      noEnum:
        'Avoid `enum` — use an object or a map instead (see contributing/code-style.md).',
    },
  },

  createOnce(context) {
    return {
      TSEnumDeclaration(node) {
        context.report({
          node,
          messageId: 'noEnum',
        });
      },
    };
  },
};
