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

const suggestion =
  'Consider using an if statement or optional chaining instead.';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detects usage of logical or ternary expressions at the statement level',
    },
    fixable: 'code',
    schema: [],
    messages: {
      logical: `Avoid using the {{op}} operator at the top level. ${suggestion}`,
      ternary: `Avoid using ternary operators at the top level. ${suggestion}`,
    },
  },

  createOnce(context) {
    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    /**
     * Can only auto-fix e.g. `foo && foo(...)` to `foo?.()` or `foo.bar && foo.bar.baz()` to `foo.bar?.baz()`
     * @param {import('estree').LogicalExpression} node
     * @return {import('eslint').Rule.ReportFixer | null}
     */
    function makeFixer(node) {
      if (node.operator !== '&&') return null;
      if (node.right.type !== 'CallExpression') return null;

      // foo.bar && foo.bar(...)
      if (
        context.sourceCode.getText(node.left) ===
        context.sourceCode.getText(node.right.callee)
      ) {
        return fixer =>
          fixer.replaceTextRange(
            [node.left.range[1], node.right.callee.range[1]],
            '?.',
          );
      }

      // foo.bar && foo.bar.baz(...)
      if (
        node.right.callee.type === 'MemberExpression' &&
        context.sourceCode.getText(node.left) ===
          context.sourceCode.getText(node.right.callee.object)
      ) {
        return fixer =>
          fixer.replaceTextRange(
            [node.left.range[1], node.right.callee.object.range[1]],
            '?',
          );
      }

      return null;
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      ExpressionStatement(node) {
        if (node.expression.type === 'LogicalExpression') {
          context.report({
            node,
            messageId: 'logical',
            data: { op: node.expression.operator },
            fix: makeFixer(node.expression),
          });
        } else if (node.expression.type === 'ConditionalExpression') {
          context.report({ node, messageId: 'ternary' });
        }
      },
    };
  },
};
