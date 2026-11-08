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

import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig, type Plugin} from 'vitest/config';

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Loads a generated `SKILL.md` as text.
 *
 * The Python server reads these from disk at runtime, so the skill a test
 * checks is the same artifact the model is given. Without it the tests would be
 * checking a mock of the thing they exist to check.
 */
function skillTextImports(): Plugin {
  return {
    name: 'skill-text-imports',
    enforce: 'pre',
    load(id) {
      const path = id.split('?')[0]!;
      if (!path.endsWith('.md')) return null;
      return `export default ${JSON.stringify(readFileSync(path, 'utf8'))};`;
    },
  };
}

export default defineConfig({
  plugins: [skillTextImports()],
  resolve: {
    alias: {
      // Test the source, not the last build of it.
      '@travel-a2ui/renderer': resolve(root, 'renderers/react/src/index.ts'),
    },
  },
  test: {
    // `.tsx` as well as `.ts`, because a test that renders a component is
    // written in JSX like the component is. Without it a new `.test.tsx` is
    // silently not collected, and the suite goes green having run nothing —
    // which is how this pattern was found.
    include: ['renderers/*/test/**/*.test.ts?(x)', 'apps/*/test/**/*.test.ts?(x)'],
    environment: 'node',
    testTimeout: 20_000,
  },
});
