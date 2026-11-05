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

import type BabelTemplate from '@babel/template';
import type {NodePath} from '@babel/traverse';
import type * as BabelTypes from '@babel/types';
import type {Attribute, Options} from '@svgr/babel-plugin-add-jsx-attribute';

type PluginAPI = {
  types: typeof BabelTypes;
  template: typeof BabelTemplate;
};

const positionMethod = {
  start: 'unshiftContainer',
  end: 'pushContainer',
} as const;

const addJSXAttribute = ({types: t, template}: PluginAPI, opts: Options) => {
  function getAttributeValue({
    literal,
    value,
  }: Pick<Attribute, 'literal' | 'value'>):
    | BabelTypes.JSXExpressionContainer
    | BabelTypes.StringLiteral
    | null {
    if (typeof value === 'boolean') {
      return t.jsxExpressionContainer(t.booleanLiteral(value));
    }

    if (typeof value === 'number') {
      return t.jsxExpressionContainer(t.numericLiteral(value));
    }

    if (typeof value === 'string' && literal) {
      return t.jsxExpressionContainer(template.expression.ast(value));
    }

    if (typeof value === 'string') {
      return t.stringLiteral(value);
    }

    return null;
  }

  function getAttribute({spread, name, value, literal}: Attribute) {
    if (spread) {
      return t.jsxSpreadAttribute(t.identifier(name));
    }

    return t.jsxAttribute(t.jsxIdentifier(name), getAttributeValue({value, literal}));
  }

  return {
    visitor: {
      JSXOpeningElement(path: NodePath<BabelTypes.JSXOpeningElement>) {
        if (!t.isJSXIdentifier(path.node.name)) return;
        if (!opts.elements.includes(path.node.name.name)) return;

        opts.attributes.forEach(
          ({name, value = null, spread = false, literal = false, position = 'end'}) => {
            const method = positionMethod[position];
            const newAttribute = getAttribute({spread, name, value, literal});
            const attributes = path.get('attributes');

            const isEqualAttribute = (
              attribute: NodePath<BabelTypes.JSXAttribute | BabelTypes.JSXSpreadAttribute>,
            ) => {
              if (spread) {
                return attribute.get('argument').isIdentifier({name});
              }

              return attribute.get('name').isJSXIdentifier({name});
            };

            const replaced = attributes.some(attribute => {
              if (!isEqualAttribute(attribute)) {
                return false;
              }

              // Only add the color if it doesn't explicitly say no
              // color
              const attrValue = attribute.get('value');
              if (!attrValue.isStringLiteral() || attrValue.node.value !== 'none') {
                attribute.replaceWith(newAttribute);
              }

              return true;
            });

            if (!replaced) {
              path[method]('attributes', newAttribute);
            }
          },
        );
      },
    },
  };
};

export default addJSXAttribute;
