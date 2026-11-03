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

module.exports = {
  prettier: true,
  prettierConfig: {
    singleQuote: true,
  },
  svgoConfig: {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: { removeUnknownsAndDefaults: false },
        },
      },
      'removeDimensions',
    ],
  },
  jsx: {
    babelConfig: {
      plugins: [
        [
          './add-attribute.ts',
          {
            elements: ['path', 'Path', 'rect', 'Rect'],
            attributes: [
              {
                name: 'fill',
                value: 'currentColor',
                spread: false,
                literal: false,
                position: 'end',
              },
            ],
          },
        ],
        [
          '@svgr/babel-plugin-add-jsx-attribute',
          {
            elements: ['svg', 'Svg'],
            attributes: [
              {
                name: 'style',
                value: '({ color: "inherit", ...props.style })',
                spread: false,
                literal: true,
                position: 'end',
              },
            ],
          },
          'add-style',
        ],
      ],
    },
  },
};
