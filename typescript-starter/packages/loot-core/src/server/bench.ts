#!/usr/bin/env node
/**
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
import * as fs from 'fs';

import {logger} from '#platform/server/log';

import * as db from './db';

const queries = fs
  .readFileSync(__dirname + '/../../src/server/slow-queries.txt', 'utf8')
  .split('___BOUNDARY')
  .map(q => q.trim());

function runQueries() {
  for (let i = 0; i < queries.length; i++) {
    if (queries[i] !== '') {
      db.runQuery(queries[i], [], true);
    }
  }
}

async function run() {
  await db.openDatabase();
  const start = Date.now();
  runQueries();
  logger.log(Date.now() - start);
}

void run();
