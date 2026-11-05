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

import {enableOpenID, getActiveLoginMethod, needsBootstrap} from '#account-db';
import {config} from '#load-config';

if (needsBootstrap()) {
  console.log(
    "It looks like you don't have a password set yet. Password is the fallback authentication method when using OpenID. Execute the command reset-password before using this command!",
  );

  process.exit(1);
} else {
  console.log('Enabling openid based on Environment variables or config.json');
  try {
    const loginMethod = getActiveLoginMethod();
    console.log(`Current login method: ${loginMethod}`);

    if (loginMethod === 'openid') {
      console.log('OpenID already enabled.');
      process.exit(0);
    }
    const {error} = (await enableOpenID(config.getProperties())) || {};

    if (error) {
      console.log('Error enabling openid:', error);
      if (error === 'invalid-login-settings') {
        console.log(
          'Error configuring OpenID. Please verify that the configuration file or environment variables are correct.',
        );

        process.exit(1);
      } else {
        console.log(
          'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
        );

        process.exit(2);
      }
    }
    console.log('OpenID enabled!');
    console.log('Note: The first user to login with OpenID will be the owner of the server.');
  } catch (err) {
    console.log('Unexpected error:', err);
    console.log(
      'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
    );
    process.exit(2);
  }
}
