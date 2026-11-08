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

const {eslintCompatPlugin} = require('@oxlint/plugins');

module.exports = eslintCompatPlugin({
  meta: {
    name: 'eslint-plugin-actual',
  },
  rules: {
    'no-untranslated-strings': require('./rules/no-untranslated-strings'),
    'prefer-trans-over-t': require('./rules/prefer-trans-over-t'),
    typography: require('./rules/typography'),
    'prefer-if-statement': require('./rules/prefer-if-statement'),
    'prefer-logger-over-console': require('./rules/prefer-logger-over-console'),
    'object-shorthand-properties': require('./rules/object-shorthand-properties'),
    'prefer-const': require('./rules/prefer-const'),
    'no-anchor-tag': require('./rules/no-anchor-tag'),
    'no-enum': require('./rules/no-enum'),
    'no-react-default-import': require('./rules/no-react-default-import'),
    'prefer-subpath-imports': require('./rules/prefer-subpath-imports'),
    'enforce-boundaries': require('./rules/enforce-boundaries'),
    'no-extraneous-dependencies': require('./rules/no-extraneous-dependencies'),
  },
});
