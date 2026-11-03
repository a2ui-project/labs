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

import path from 'node:path';

import type { CapacitorConfig } from '@capacitor/cli';

const actualAppWebBuildPath = path.join(
  path.dirname(require.resolve('@actual-app/web/package.json')),
  'build',
);

const baseConfig: CapacitorConfig = {
  appId: 'org.actualbudget',
  appName: 'Actual Budget',
  webDir: actualAppWebBuildPath,
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
    },
  },
};

const devConfig: CapacitorConfig = {
  ...baseConfig,
  android: {
    ...baseConfig.android,
    allowMixedContent: true,
  },
  server: {
    cleartext: true,
    // Put in http://10.0.2.2:5006 for Android emulator to access server running on local machine.
    allowNavigation: ['localhost', '10.0.2.2'],
  },
};

// NODE_ENV is unset in development, 'production' in production builds.
const config: CapacitorConfig =
  process.env.NODE_ENV === 'production' ? baseConfig : devConfig;

// https://capacitorjs.com/docs/config
// eslint-disable-next-line import/no-default-export
export default config;
