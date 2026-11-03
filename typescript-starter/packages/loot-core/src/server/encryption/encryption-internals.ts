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
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function browserAlgorithmName(name) {
  switch (name) {
    case 'aes-256-gcm':
      return 'AES-GCM';
    default:
      throw new Error('unsupported crypto algorithm: ' + name);
  }
}

export function randomBytes(n) {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(n)));
}

export async function encrypt(masterKey, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedArrayBuffer = await crypto.subtle.encrypt(
    {
      name: browserAlgorithmName(ENCRYPTION_ALGORITHM),
      iv,
      tagLength: 128,
    },
    masterKey.getValue().raw,
    value,
  );

  const encrypted = Buffer.from(encryptedArrayBuffer);

  // Strip the auth tag off the end
  const authTag = encrypted.slice(-16);
  const strippedEncrypted = encrypted.slice(0, -16);

  return {
    value: strippedEncrypted,
    meta: {
      keyId: masterKey.getId(),
      algorithm: ENCRYPTION_ALGORITHM,
      iv: Buffer.from(iv).toString('base64'),
      authTag: authTag.toString('base64'),
    },
  };
}

export async function decrypt(masterKey, encrypted, meta) {
  const { algorithm, iv, authTag } = meta;

  const decrypted = await crypto.subtle.decrypt(
    {
      name: browserAlgorithmName(algorithm),
      iv: Buffer.from(iv, 'base64'),
      tagLength: 128,
    },
    masterKey.getValue().raw,
    Buffer.concat([encrypted, Buffer.from(authTag, 'base64')]),
  );

  return Buffer.from(decrypted);
}

export async function createKey({ secret, salt }) {
  const passwordBuffer = Buffer.from(secret);
  const saltBuffer = Buffer.from(salt);

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey'],
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-512',
      salt: saltBuffer,
      iterations: 10000,
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  const exported = await crypto.subtle.exportKey('raw', derivedKey);

  return {
    raw: derivedKey,
    base64: Buffer.from(exported).toString('base64'),
  };
}

export async function importKey(str) {
  const key = await crypto.subtle.importKey(
    'raw',
    Buffer.from(str, 'base64'),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  return {
    raw: key,
    base64: str,
  };
}
