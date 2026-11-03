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
// Requirements
//------------------------------------------------------------------------------

import { runClassic } from 'eslint-vitest-rule-tester';

import plugin from '../../index';
const rule = plugin.rules['no-anchor-tag'];

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

void runClassic(
  'no-anchor-tag',
  rule,
  {
    valid: [
      // Link component usage
      `<Link variant="external" to="https://example.com">Click me</Link>`,
      `<Link variant="internal" to="/path">Internal link</Link>`,

      // Other JSX elements
      `<div>Content</div>`,
      `<span>Text</span>`,
      `<button>Click</button>`,

      // JSX with different casing
      `<A>Not an anchor</A>`,
      `<Anchor>Not an anchor</Anchor>`,

      // Self-closing tags
      `<img src="test.jpg" />`,
      `<br />`,
    ],

    invalid: [
      {
        code: '<a href="https://example.com">Link</a>',
        output: null,
        errors: [
          {
            messageId: 'useLink',
          },
        ],
      },
      {
        code: '<a href="/path" target="_blank">External</a>',
        output: null,
        errors: [
          {
            messageId: 'useLink',
          },
        ],
      },
      {
        code: '<a>Click here</a>',
        output: null,
        errors: [
          {
            messageId: 'useLink',
          },
        ],
      },
      {
        code: '<div><a href="/test">Link</a></div>',
        output: null,
        errors: [
          {
            messageId: 'useLink',
          },
        ],
      },
      {
        code: 'function Component() { return <a href="/">Home</a>; }',
        output: null,
        errors: [
          {
            messageId: 'useLink',
          },
        ],
      },
    ],
  },
  {
    parserOptions: {
      ecmaVersion: 2020,
      ecmaFeatures: { jsx: true },
      sourceType: 'module',
    },
  },
);
