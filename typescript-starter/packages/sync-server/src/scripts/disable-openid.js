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

import {disableOpenID, getActiveLoginMethod, needsBootstrap} from '#account-db';
import {promptPassword} from '#util/prompt';

if (needsBootstrap()) {
  console.log('System needs to be bootstrapped first. OpenID is not enabled.');

  process.exit(1);
} else {
  console.log('To disable OpenID, you have to enter your server password:');
  try {
    const loginMethod = getActiveLoginMethod();
    console.log(`Current login method: ${loginMethod}`);

    if (loginMethod === 'password') {
      console.log('OpenID already disabled.');
      process.exit(0);
    }

    const password = await promptPassword();
    const {error} = (await disableOpenID({password})) || {};

    if (error) {
      console.log('Error disabling OpenID:', error);
      console.log(
        'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
      );
      process.exit(2);
    }
    console.log('OpenID disabled!');
    console.log(
      'Note: you will need to log in with the password on any browsers or devices that are currently logged in.',
    );
  } catch (err) {
    console.log('Unexpected error:', err);
    console.log(
      'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
    );
    process.exit(2);
  }
}
