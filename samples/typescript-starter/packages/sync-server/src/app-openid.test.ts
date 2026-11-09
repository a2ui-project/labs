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

import request from 'supertest';

import type {ConfigParameter} from '#accounts/openid';

import {getAccountDb} from './account-db';
import {bootstrapPassword} from './accounts/password';
import {handlers as app, openIdConfigRateLimiter} from './app-openid';

function insertOpenIdAuth(extraData: ConfigParameter) {
  getAccountDb().mutate(
    'INSERT INTO auth (method, display_name, extra_data, active) VALUES (?, ?, ?, ?)',
    ['openid', 'OpenID', JSON.stringify(extraData), 1],
  );
}

describe('/config', () => {
  beforeEach(() => {
    openIdConfigRateLimiter.resetKey('127.0.0.1');
  });

  afterEach(() => {
    getAccountDb().mutate('DELETE FROM auth');
  });

  it('rejects config access after an owner has already been created', async () => {
    await bootstrapPassword('bootstrap-password');
    insertOpenIdAuth({
      client_id: 'client-id',
      client_secret: 'client-secret',
      issuer: 'https://issuer.example.com',
    });

    const res = await request(app).post('/config').send({password: 'bootstrap-password'});

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'already-bootstraped',
    });
  });
});
