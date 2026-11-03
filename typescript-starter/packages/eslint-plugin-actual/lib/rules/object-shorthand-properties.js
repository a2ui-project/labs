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

/* @see https://eslint.org/docs/latest/rules/object-shorthand */
//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce property shorthand syntax in object literals (properties only)',
    },
    fixable: 'code',
    schema: [],
    messages: {
      useShorthand:
        'Expected property shorthand. Use `{{key}}` instead of `{{key}}: {{key}}`.',
    },
  },

  createOnce(context) {
    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    /**
     * Checks if a property can use shorthand syntax
     * @param {import('estree').Property} node
     * @returns {boolean}
     */
    function canUseShorthand(node) {
      // Only check properties (not methods)
      if (node.method) {
        return false;
      }

      // Key must be an identifier (not computed)
      if (node.key.type !== 'Identifier' || node.computed) {
        return false;
      }

      // Value must be an identifier with the same name as the key
      if (
        node.value.type !== 'Identifier' ||
        node.key.name !== node.value.name
      ) {
        return false;
      }

      // Already using shorthand
      if (node.shorthand) {
        return false;
      }

      return true;
    }

    /**
     * Creates a fixer to convert to shorthand
     * @param {import('estree').Property} node
     * @returns {import('eslint').Rule.ReportFixer}
     */
    function makeFixer(node) {
      return fixer => {
        const keyText = context.sourceCode.getText(node.key);
        return fixer.replaceText(node, keyText);
      };
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      Property(node) {
        if (canUseShorthand(node)) {
          context.report({
            node,
            messageId: 'useShorthand',
            data: {
              key: node.key.name,
            },
            fix: makeFixer(node),
          });
        }
      },
    };
  },
};
