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

import {cursorTo} from 'node:readline';

export async function promptPassword() {
  const password = await askForPassword('Enter a password, then press enter: ');

  if (password === '') {
    console.log('Password cannot be empty.');
    return promptPassword();
  }

  const password2 = await askForPassword('Enter the password again, then press enter: ');

  if (password !== password2) {
    console.log('Passwords do not match.');
    return promptPassword();
  }

  return password;
}

async function askForPassword(prompt: string) {
  let dataListener: (key: Buffer) => void = () => null;
  let endListener: () => void = () => null;

  const promise = new Promise<string>(resolve => {
    let result = '';
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    dataListener = (key: Buffer) => {
      switch (key[0]) {
        case 0x03: // ^C
          process.exit();
          break;
        case 0x0d: // Enter
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve(result);
          break;
        case 0x7f: // Backspace
        case 0x08: // Delete
          if (result) {
            result = result.slice(0, -1);
            cursorTo(process.stdout, prompt.length + result.length);
            process.stdout.write(' ');
            cursorTo(process.stdout, prompt.length + result.length);
          }
          break;
        default:
          result += key;
          process.stdout.write('*');
          break;
      }
    };
    process.stdin.on('data', dataListener);

    endListener = () => resolve(result);
    process.stdin.on('end', endListener);
  });

  const answer = await promise;

  process.stdin.off('data', dataListener);
  process.stdin.off('end', endListener);

  process.stdout.write('\n');

  return answer;
}
