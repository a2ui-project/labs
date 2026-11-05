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
      description: 'Forbid usage of <a> tags in favor of <Link> component',
    },
    fixable: null,
    schema: [],
    messages: {
      useLink: 'Using <a> is discouraged, please use <Link> instead.',
    },
  },

  createOnce(context) {
    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    /**
     * Checks if the current file is the Link component itself
     * @returns {boolean}
     */
    function isLinkComponentFile() {
      const filename = context.filename;
      const normalizedFilename = filename.replace(/\\/g, '/');
      return normalizedFilename.includes('packages/desktop-client/src/components/common/Link.tsx');
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      JSXOpeningElement(node) {
        // Skip if this is the Link component file itself
        if (isLinkComponentFile()) {
          return;
        }

        // Check if the element name is "a"
        if (node.name.type === 'JSXIdentifier' && node.name.name === 'a') {
          context.report({
            node,
            messageId: 'useLink',
          });
        }
      },
    };
  },
};
