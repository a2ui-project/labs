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

import peggy from 'peggy';

// Matches the grammar files imported across the codebase (`.pegjs`/`.peggy`).
const GRAMMAR_RE = /\.peg(js|gy)$/;

/**
 * In-repo replacement for the third-party `vite-plugin-peggy-loader`. Compiles
 * imported Peggy grammars into an ES module that exports the generated parser
 * (notably its `parse` function), using the `peggy` dependency directly.
 *
 * @returns {import('vite').Plugin}
 */
export function peggyLoader() {
  return {
    name: 'peggy-loader',
    transform(grammar, id) {
      if (!GRAMMAR_RE.test(id)) {
        return null;
      }

      const code = peggy.generate(grammar, {
        output: 'source',
        format: 'es',
        grammarSource: id,
      });

      return {code, map: null};
    },
  };
}
