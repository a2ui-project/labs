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

const { visitParents } = require('unist-util-visit-parents');

function githubMentionPlugin() {
  const pattern = /@([\w-]+)/g;
  const transformer = async ast => {
    visitParents(ast, 'text', (node, ancestors) => {
      const text = node.value;
      let match;
      let lastIndex = 0;
      const segments = [];
      while ((match = pattern.exec(text))) {
        const { index } = match;
        const username = match[1];
        segments.push({
          type: 'text',
          value: text.slice(lastIndex, index),
        });
        segments.push({
          type: 'link',
          url: `https://github.com/${username}`,
          children: [
            {
              type: 'text',
              // the @ is intentionally not included
              value: username,
            },
          ],
        });
        lastIndex = index + match[0].length;
      }
      segments.push({
        type: 'text',
        value: text.slice(lastIndex),
      });
      if (segments.length > 1) {
        const parent = ancestors[ancestors.length - 1];
        parent.children.splice(parent.children.indexOf(node), 1, ...segments);
      }
    });
  };
  return transformer;
}

module.exports = githubMentionPlugin;
