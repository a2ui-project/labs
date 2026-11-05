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

import {getAccountDb} from '../src/account-db';

export const up = async function () {
  await getAccountDb().exec(
    `UPDATE secrets SET name = 'gocardless_secretId' WHERE name = 'nordigen_secretId'`,
  );
  await getAccountDb().exec(
    `UPDATE secrets SET name = 'gocardless_secretKey' WHERE name = 'nordigen_secretKey'`,
  );
};

export const down = async function () {
  await getAccountDb().exec(
    `UPDATE secrets SET name = 'nordigen_secretId' WHERE name = 'gocardless_secretId'`,
  );
  await getAccountDb().exec(
    `UPDATE secrets SET name = 'nordigen_secretKey' WHERE name = 'gocardless_secretKey'`,
  );
};
