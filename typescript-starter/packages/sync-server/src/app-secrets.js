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

import express from 'express';

import { isAdmin } from './account-db';
import { SecretName, secretsService } from './services/secrets-service';
import * as UserService from './services/user-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from './util/middlewares';
import { isValidFileId } from './util/paths';

const app = express();

export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(validateSessionMiddleware);

// Global secrets are admin-managed.
function canManageGlobalSecrets(userId) {
  return isAdmin(userId);
}

// Per-budget-file secrets are managed by file owners
function isBudgetFileOwner(fileId, userId) {
  const { granted } = UserService.checkFilePermission(fileId, userId) || {
    granted: 0,
  };
  return granted > 0;
}

function canManagePerBudgetFileSecrets(fileId, userId) {
  return isAdmin(userId) || isBudgetFileOwner(fileId, userId);
}

app.post('/', async (req, res) => {
  const { name, value } = req.body || {};
  const fileId = req.get('X-Actual-File-Id');
  const perBudgetFile = fileId != null;

  if (!(name in SecretName)) {
    res.status(400).send({
      status: 'error',
      reason: 'invalid-secret-name',
      details: 'Unknown secret name',
    });
    return;
  }

  if (perBudgetFile) {
    if (!isValidFileId(fileId)) {
      res.status(400).send({
        status: 'error',
        reason: 'invalid-file-id',
        details: 'invalid fileId',
      });
      return;
    }

    if (!canManagePerBudgetFileSecrets(fileId, res.locals.user_id)) {
      res.status(403).send({
        status: 'error',
        reason: 'file-access-denied',
        details: "You don't have permissions over this file",
      });
      return;
    }
  } else if (!canManageGlobalSecrets(res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'not-admin',
      details: 'You have to be admin to manage global secrets',
    });
    return;
  }

  const secretFileId = perBudgetFile ? fileId : null;
  secretsService.set(name, value, secretFileId);

  res.status(200).send({ status: 'ok' });
});

app.delete('/:name', async (req, res) => {
  const name = req.params.name;
  const fileId = req.get('X-Actual-File-Id');
  const perBudgetFile = fileId != null;

  if (!(name in SecretName)) {
    res.status(404).send('key not found');
    return;
  }

  if (!perBudgetFile) {
    if (!canManageGlobalSecrets(res.locals.user_id)) {
      res.status(403).send({
        status: 'error',
        reason: 'not-admin',
        details: 'You have to be admin to manage global secrets',
      });
      return;
    }

    secretsService.reset(name);
    res.status(200).send({ status: 'ok' });
    return;
  }

  if (!isValidFileId(fileId)) {
    res.status(400).send({
      status: 'error',
      reason: 'invalid-file-id',
      details: 'invalid fileId',
    });
    return;
  }

  if (!canManagePerBudgetFileSecrets(fileId, res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'file-access-denied',
      details: "You don't have permissions over this file",
    });
    return;
  }

  secretsService.reset(name, fileId);
  res.status(200).send({ status: 'ok' });
});

app.get('/:name', async (req, res) => {
  const name = req.params.name;
  const fileId = req.get('X-Actual-File-Id');
  const perBudgetFile = fileId != null;

  if (!(name in SecretName)) {
    res.status(404).send('key not found');
    return;
  }

  if (!perBudgetFile) {
    if (!canManageGlobalSecrets(res.locals.user_id)) {
      res.status(403).send({
        status: 'error',
        reason: 'not-admin',
        details: 'You have to be admin to manage global secrets',
      });
      return;
    }
  } else {
    if (!isValidFileId(fileId)) {
      res.status(400).send({
        status: 'error',
        reason: 'invalid-file-id',
        details: 'invalid fileId',
      });
      return;
    }

    if (!canManagePerBudgetFileSecrets(fileId, res.locals.user_id)) {
      res.status(403).send({
        status: 'error',
        reason: 'file-access-denied',
        details: "You don't have permissions over this file",
      });
      return;
    }
  }

  const keyExists = secretsService.exists(name, perBudgetFile ? fileId : null);
  if (keyExists) {
    res.sendStatus(204);
  } else {
    res.status(404).send('key not found');
  }
});
