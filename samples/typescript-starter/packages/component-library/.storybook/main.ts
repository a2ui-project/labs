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

import {dirname} from 'path';
import {fileURLToPath} from 'url';

import babel from '@rolldown/plugin-babel';
import type {StorybookConfig} from '@storybook/react-vite';
import react, {reactCompilerPreset} from '@vitejs/plugin-react';

// Any workspace package's source; node_modules stays excluded by the babel
// plugin's default exclude.
const reactCompilerInclude = /[\\/]packages[\\/][^\\/]+[\\/]src[\\/].*\.[jt]sx?(?:$|\?)/;

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const config: StorybookConfig = {
  stories: [
    '../src/Concepts/*.mdx',
    '../src/themes/*.mdx',
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    getAbsolutePath('@chromatic-com/storybook'),
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-docs'),
  ],
  framework: getAbsolutePath('@storybook/react-vite'),
  core: {
    disableTelemetry: true,
  },
  staticDirs: ['./public'],
  async viteFinal(config) {
    const {mergeConfig} = await import('vite');

    return mergeConfig(config, {
      plugins: [
        react(),
        babel({
          include: [reactCompilerInclude],
          // n.b. Must be a string to ensure plugin resolution order. See https://github.com/actualbudget/actual/pull/5853
          presets: [reactCompilerPreset()],
        }),
      ],
      resolve: {
        tsconfigPaths: true,
      },
    });
  },
};

export default config;
