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

import {sign} from 'jws';
import type {Algorithm} from 'jws';

type Header = {typ: string; alg: Algorithm; kid: string};

type JWTPayload = {
  iss: string;
  aud: string;
  iat: number;
  exp: number;
};

function getJWTHeader(applicationId: string): Header {
  return {typ: 'JWT', alg: 'RS256', kid: applicationId};
}

function getJWTBody(exp = 3600): JWTPayload {
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: timestamp,
    exp: timestamp + exp,
  };
}

export function getJWT(applicationId: string, secretKey: string, exp = 3600): string {
  return sign({
    header: getJWTHeader(applicationId),
    payload: getJWTBody(exp),
    secret: secretKey,
  });
}
