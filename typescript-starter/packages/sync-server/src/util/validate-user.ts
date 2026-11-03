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

import type { Request, Response } from 'express';
import ipaddr from 'ipaddr.js';

import { getSession } from '#account-db';
import { config } from '#load-config';

export const TOKEN_EXPIRATION_NEVER = -1;
const MS_PER_SECOND = 1000;

export function validateSession(req: Request, res: Response) {
  let { token } = req.body || {};

  if (!token) {
    token = req.headers['x-actual-token'];
  }

  const session = getSession(token);

  if (!session) {
    res.status(401);
    res.send({
      status: 'error',
      reason: 'unauthorized',
      details: 'token-not-found',
    });
    return null;
  }

  if (
    session.expires_at !== TOKEN_EXPIRATION_NEVER &&
    session.expires_at * MS_PER_SECOND <= Date.now()
  ) {
    res.status(401);
    res.send({
      status: 'error',
      reason: 'token-expired',
    });
    return null;
  }

  return session;
}

export function validateAuthHeader(req: Request) {
  // fallback to trustedProxies when trustedAuthProxies not set
  const trustedAuthProxies: string[] =
    config.get('trustedAuthProxies') ?? config.get('trustedProxies');
  // ensure the first hop from our server is trusted
  const peer = req.socket.remoteAddress;
  if (peer === undefined) {
    console.error(`Header Auth Login attempted but there was no defined peer.`);
    return false;
  }
  const peerIp = ipaddr.process(peer);
  const rangeList = {
    allowed_ips: trustedAuthProxies.map(q => ipaddr.parseCIDR(q)),
  };

  const matched = ipaddr.subnetMatch(peerIp, rangeList, 'fail');

  if (matched === 'allowed_ips') {
    console.info(`Header Auth Login permitted from ${peer}`);
    return true;
  } else {
    console.warn(`Header Auth Login attempted from ${peer}`);
    return false;
  }
}
