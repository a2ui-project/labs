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

import { type ReactNode } from 'react';

import type { Preview } from '@storybook/react-vite';

import darkThemeCss from '../src/themes/dark.css?inline';
import lightThemeCss from '../src/themes/light.css?inline';
import midnightThemeCss from '../src/themes/midnight.css?inline';
import paletteCss from '../src/themes/palette.css?inline';

const THEMES = {
  light: lightThemeCss,
  dark: darkThemeCss,
  midnight: midnightThemeCss,
} as const;

type ThemeName = keyof typeof THEMES;

const ThemedStory = ({
  themeName,
  children,
}: {
  themeName?: ThemeName;
  children?: ReactNode;
}) => {
  if (!themeName || !THEMES[themeName]) {
    throw new Error(`No theme specified`);
  }

  return (
    <div>
      <style>{paletteCss}</style>
      <style>{THEMES[themeName]}</style>
      {children}
    </div>
  );
};

const preview: Preview = {
  decorators: [
    (Story, { globals }) => {
      const themeName = globals.theme;

      return (
        <ThemedStory themeName={themeName}>
          <Story />
        </ThemedStory>
      );
    },
  ],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'midnight', title: 'Midnight' },
        ],
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;
