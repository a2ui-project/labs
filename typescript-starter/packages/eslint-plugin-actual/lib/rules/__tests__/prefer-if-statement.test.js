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

import {runClassic} from 'eslint-vitest-rule-tester';

import plugin from '../../index';
const rule = plugin.rules['prefer-if-statement'];

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

void runClassic(
  'prefer-if-statement',
  rule,
  {
    valid: [
      `if (foo && bar) { console.log('Hello, world!'); }`,
      `myFunc(foo && bar);`,
      `if (foo || bar) { console.log('Hello, world!'); }`,
      `myFunc(foo || bar);`,
      `if (foo ? bar : baz) { console.log('Hello, world!'); }`,
      `<div>{foo && bar}</div>`,
      `<div>{foo || bar}</div>`,
      `<div>{foo ? bar : baz}</div>`,
    ],

    invalid: [
      {
        code: 'foo && bar;',
        output: null,
        errors: [
          {
            messageId: 'logical',
            data: {op: '&&'},
          },
        ],
      },
      {
        code: 'foo || bar;',
        output: null,
        errors: [
          {
            messageId: 'logical',
            data: {op: '||'},
          },
        ],
      },
      {
        code: 'foo ? bar : baz;',
        output: null,
        errors: [{messageId: 'ternary'}],
      },
      {
        code: 'function foo() { bar && baz; }',
        output: null,
        errors: [
          {
            messageId: 'logical',
            data: {op: '&&'},
          },
        ],
      },
      {
        code: 'function foo() { bar || baz; }',
        output: null,
        errors: [
          {
            messageId: 'logical',
            data: {op: '||'},
          },
        ],
      },
      {
        code: 'function foo() { bar ? baz : qux; }',
        output: null,
        errors: [{messageId: 'ternary'}],
      },
      {
        code: 'foo && foo();',
        output: 'foo?.();',
        errors: [
          {
            messageId: 'logical',
            data: {op: '&&'},
          },
        ],
      },
      {
        code: 'foo || foo();',
        output: null,
        errors: [
          {
            messageId: 'logical',
            data: {op: '||'},
          },
        ],
      },
      {
        code: 'foo.bar && foo.bar();',
        output: 'foo.bar?.();',
        errors: [
          {
            messageId: 'logical',
            data: {op: '&&'},
          },
        ],
      },
      {
        code: 'foo.bar && foo.bar.baz();',
        output: 'foo.bar?.baz();',
        errors: [
          {
            messageId: 'logical',
            data: {op: '&&'},
          },
        ],
      },
      {
        code: 'foo ? bar() : baz();',
        output: null,
        errors: [{messageId: 'ternary'}],
      },
    ],
  },
  {
    parserOptions: {
      ecmaVersion: 2020,
      ecmaFeatures: {jsx: true},
    },
  },
);
