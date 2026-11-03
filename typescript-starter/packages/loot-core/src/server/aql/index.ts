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

import { Query } from '#shared/query';
import type { QueryState } from '#shared/query';

import type { CompilerState, SqlPieces } from './compiler';
import { compileAndRunAqlQuery, runCompiledAqlQuery } from './exec';
import type { AqlQueryParams } from './exec';
import { schema, schemaConfig } from './schema';
import { schemaExecutors } from './schema/executors';

export {
  convertForInsert,
  convertForUpdate,
  convertFromSelect,
  convertInputType,
} from './schema-helpers';
export { compileQuery } from './compiler';
export { makeViews } from './views';
export { schema, schemaConfig } from './schema';

export function aqlCompiledQuery(
  queryState: QueryState,
  sqlPieces: SqlPieces,
  compilerState: CompilerState,
  params?: AqlQueryParams,
) {
  return runCompiledAqlQuery(queryState, sqlPieces, compilerState, {
    params,
    executors: schemaExecutors,
  });
}

export function aqlQuery(query: Query | QueryState, params?: AqlQueryParams) {
  if (query instanceof Query) {
    query = query.serialize();
  }

  return compileAndRunAqlQuery(schema, schemaConfig, query, {
    params,
    executors: schemaExecutors,
  });
}
