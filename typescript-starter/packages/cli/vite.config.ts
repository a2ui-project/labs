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

import fs from 'fs';
import path from 'path';

import {visualizer} from 'rollup-plugin-visualizer';
import {defineConfig} from 'vite';

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  define: {
    __CLI_VERSION__: JSON.stringify(pkg.version),
  },
  ssr: {noExternal: true, external: ['@actual-app/api']},
  build: {
    ssr: true,
    target: 'node22',
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'cli.js',
        banner: chunk => (chunk.isEntry ? '#!/usr/bin/env node' : ''),
      },
    },
  },
  plugins: [visualizer({template: 'raw-data', filename: 'dist/stats.json'})],
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 10_000,
  },
});
