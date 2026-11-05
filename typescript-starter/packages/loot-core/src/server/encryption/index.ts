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
import {v4 as uuidv4} from 'uuid';

import * as internals from '#server/encryption/encryption-internals';

// A map of all possible master encryption keys to use, keyed by
// unique id
let keys = {};

class Key {
  id;
  value;

  constructor({id}) {
    this.id = id || uuidv4();
  }

  async createFromPassword({password, salt}) {
    this.value = await internals.createKey({secret: password, salt});
  }

  async createFromBase64(str) {
    this.value = await internals.importKey(str);
  }

  getId() {
    return this.id;
  }

  getValue() {
    return this.value;
  }

  serialize() {
    return {
      id: this.id,
      base64: this.value.base64,
    };
  }
}

export function getKey(keyId) {
  if (keyId == null || keys[keyId] == null) {
    throw new Error('missing-key');
  }
  return keys[keyId];
}

export function hasKey(keyId) {
  return keyId in keys;
}

export async function encrypt(value, keyId) {
  return internals.encrypt(getKey(keyId), value);
}

export async function decrypt(encrypted, meta) {
  return internals.decrypt(getKey(meta.keyId), encrypted, meta);
}

export function randomBytes(n) {
  return internals.randomBytes(n);
}

export async function loadKey(key) {
  let keyInstance;
  if (!(key instanceof Key)) {
    keyInstance = new Key({id: key.id});
    await keyInstance.createFromBase64(key.base64);
  } else {
    keyInstance = key;
  }

  keys[keyInstance.getId()] = keyInstance;
}

export function unloadKey(key) {
  delete keys[key.getId()];
}

export function unloadAllKeys() {
  keys = {};
}

export async function createKey({id, password, salt}) {
  const key = new Key({id});
  await key.createFromPassword({password, salt});
  return key;
}
