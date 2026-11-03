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

import { Rule } from './rule';
import { migrateIds } from './rule-utils';

describe('migrateIds', () => {
  it('deduplicates mapped IDs in oneOf and notOneOf conditions', () => {
    const rule = new Rule({
      conditionsOp: 'and',
      conditions: [
        {
          op: 'oneOf',
          field: 'payee',
          value: ['payee-a', 'payee-b', 'payee-c'],
          options: null,
        },
        {
          op: 'notOneOf',
          field: 'payee',
          value: ['payee-a', 'payee-b', 'payee-c'],
          options: null,
        },
      ],
      actions: [],
    });
    const mappings = new Map([
      ['payee-a', 'payee-merged'],
      ['payee-b', 'payee-merged'],
    ]);

    migrateIds(rule, mappings);

    expect(rule.conditions[0].rawValue).toEqual([
      'payee-a',
      'payee-b',
      'payee-c',
    ]);
    expect(rule.conditions[0].value).toEqual(['payee-merged', 'payee-c']);
    expect(rule.conditions[0].unparsedValue).toEqual([
      'payee-merged',
      'payee-c',
    ]);
    expect(rule.conditions[1].rawValue).toEqual([
      'payee-a',
      'payee-b',
      'payee-c',
    ]);
    expect(rule.conditions[1].value).toEqual(['payee-merged', 'payee-c']);
    expect(rule.conditions[1].unparsedValue).toEqual([
      'payee-merged',
      'payee-c',
    ]);
  });
});
