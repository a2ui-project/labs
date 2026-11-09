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

import * as connection from '@actual-app/core/platform/client/connection';
import {q} from '@actual-app/core/shared/query';

import {aqlQuery} from './aqlQuery';

describe('aqlQuery', () => {
  it('runs an AQL query', async () => {
    vi.spyOn(connection, 'send').mockImplementation((name, args) => {
      if (name === 'query') {
        return Promise.resolve({data: args, dependencies: []});
      }
      return Promise.reject(new Error(`Unknown command: ${name}`));
    });

    const query = q('transactions').select('*');
    const {data} = await aqlQuery(query);
    expect(data).toEqual(query.serialize());
  });
});
