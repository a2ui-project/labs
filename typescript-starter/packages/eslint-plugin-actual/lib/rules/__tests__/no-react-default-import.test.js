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
const rule = plugin.rules['no-react-default-import'];

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

void runClassic(
  'no-react-default-import',
  rule,
  {
    valid: [
      // Named imports (correct usage)
      `import { Component, useState } from 'react';`,
      `import { Component as Comp, useState } from 'react';`,

      // Usage of named imports
      `const MyComponent = Component.extend({});`,
      `const [state, setState] = useState(0);`,

      // Other identifiers
      `const ReactLib = require('react-lib');`,
      `ReactLib.something();`,

      // Non-React member expressions
      `const obj = { React: 'test' };`,
      `obj.React.something();`,

      // JSX with Fragment (correct usage)
      `import { Fragment } from 'react';`,
      `const element = <Fragment>Test</Fragment>;`,
    ],

    invalid: [
      {
        code: 'const Component = React.Component;',
        output: null,
        errors: [
          {
            messageId: 'useNamedExport',
          },
        ],
      },
      {
        code: 'const [state, setState] = React.useState(0);',
        output: null,
        errors: [
          {
            messageId: 'useNamedExport',
          },
        ],
      },
      {
        code: 'class MyComponent extends React.Component {}',
        output: null,
        errors: [
          {
            messageId: 'useNamedExport',
          },
        ],
      },
      {
        code: 'function test() { return React.createElement("div"); }',
        output: null,
        errors: [
          {
            messageId: 'useNamedExport',
          },
        ],
      },
      {
        code: 'const element = <React.Fragment>Test</React.Fragment>;',
        output: null,
        errors: [
          {
            messageId: 'useNamedExport',
          },
          {
            messageId: 'useNamedExport',
          },
        ],
      },
    ],
  },
  {
    parserOptions: {
      ecmaVersion: 2020,
      ecmaFeatures: {jsx: true},
      sourceType: 'module',
    },
  },
);
