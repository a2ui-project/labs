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

import type {
  ObjectExpression,
  QueryState,
} from '@actual-app/core/shared/query';
import type { WithRequired } from '@actual-app/core/types/util';

class Query {
  /** @type {import('@actual-app/core/shared/query').QueryState} */
  state: QueryState;

  constructor(state: WithRequired<Partial<QueryState>, 'table'>) {
    this.state = {
      tableOptions: state.tableOptions || {},
      filterExpressions: state.filterExpressions || [],
      selectExpressions: state.selectExpressions || [],
      groupExpressions: state.groupExpressions || [],
      orderExpressions: state.orderExpressions || [],
      calculation: false,
      rawMode: false,
      withDead: false,
      validateRefs: true,
      limit: null,
      offset: null,
      ...state,
    };
  }

  filter(expr: ObjectExpression) {
    return new Query({
      ...this.state,
      filterExpressions: [...this.state.filterExpressions, expr],
    });
  }

  unfilter(exprs?: string[]) {
    const exprSet = new Set(exprs);
    return new Query({
      ...this.state,
      filterExpressions: this.state.filterExpressions.filter(
        expr => !exprSet.has(Object.keys(expr)[0]),
      ),
    });
  }

  select(
    exprs:
      | Array<ObjectExpression | string>
      | ObjectExpression
      | string
      | '*'
      | ['*'] = [],
  ) {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }

    const query = new Query({
      ...this.state,
      selectExpressions: exprs,
      calculation: false,
    });
    return query;
  }

  calculate(expr: ObjectExpression | string) {
    return new Query({
      ...this.state,
      selectExpressions: [{ result: expr }],
      calculation: true,
    });
  }

  groupBy(exprs: ObjectExpression | string | Array<ObjectExpression | string>) {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }

    return new Query({
      ...this.state,
      groupExpressions: [...this.state.groupExpressions, ...exprs],
    });
  }

  orderBy(exprs: ObjectExpression | string | Array<ObjectExpression | string>) {
    if (!Array.isArray(exprs)) {
      exprs = [exprs];
    }

    return new Query({
      ...this.state,
      orderExpressions: [...this.state.orderExpressions, ...exprs],
    });
  }

  limit(num: number) {
    return new Query({ ...this.state, limit: num });
  }

  offset(num: number) {
    return new Query({ ...this.state, offset: num });
  }

  raw() {
    return new Query({ ...this.state, rawMode: true });
  }

  withDead() {
    return new Query({ ...this.state, withDead: true });
  }

  withoutValidatedRefs() {
    return new Query({ ...this.state, validateRefs: false });
  }

  options(opts: Record<string, unknown>) {
    return new Query({ ...this.state, tableOptions: opts });
  }

  serialize() {
    return this.state;
  }

  reset() {
    return q(this.state.table);
  }

  serializeAsString() {
    return JSON.stringify(this.serialize());
  }
}

export function q(table: QueryState['table']) {
  return new Query({ table });
}
