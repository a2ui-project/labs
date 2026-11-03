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

import * as encryption from '.';

afterEach(() => encryption.unloadAllKeys());

describe('Encryption', () => {
  test('should encrypt and decrypt', async () => {
    const key = await encryption.createKey({
      id: 'foo',
      password: 'mypassword',
      salt: 'salt',
    });
    await encryption.loadKey(key);

    const data = await encryption.encrypt('hello', 'foo');

    const output = await encryption.decrypt(data.value, data.meta);
    expect(output.toString()).toBe('hello');
  });
});
