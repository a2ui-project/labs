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

// @ts-strict-ignore
export async function incrFetch(runQuery, terms, compare, makeQuery, params = []) {
  const pageCount = 500;
  let results = [];

  let fetchedIds = new Set();

  for (let i = 0; i < terms.length; i += pageCount) {
    const slice = terms.slice(i, i + pageCount).filter(id => !fetchedIds.has(id));
    if (slice.length > 0) {
      const filter = slice.map(id => compare(id)).join(' OR ');
      const query = makeQuery('(' + filter + ')');

      const rows = await runQuery(query, params, true);
      fetchedIds = new Set([...fetchedIds, ...slice]);
      results = results.concat(rows);
    }
  }

  return results;
}

export function whereIn(ids: string[], field: string) {
  const ids2 = [...new Set(ids)];

  const filter = `${field} IN (` + ids2.map(id => `'${id}'`).join(',') + ')';
  return filter;
}
