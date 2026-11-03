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

// @ts-strict-ignore
import { create, MessageSchema, toBinary } from '@actual-app/crdt';

import * as encryption from '#server/encryption';

function randomString() {
  return encryption.randomBytes(12).toString();
}

export async function makeTestMessage(keyId) {
  const binaryMsg = toBinary(
    MessageSchema,
    create(MessageSchema, {
      dataset: randomString(),
      row: randomString(),
      column: randomString(),
      value: randomString(),
    }),
  );

  return await encryption.encrypt(binaryMsg, keyId);
}
