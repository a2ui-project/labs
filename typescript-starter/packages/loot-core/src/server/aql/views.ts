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
import { quoteAlias } from './compiler';

function selectFields(fields) {
  return Object.keys(fields)
    .map(as => {
      let field = fields[as];
      const needsAs = field !== as;
      // If it's just an identifier, we automatically prefix it with
      // `_.` which makes sure it references the root table
      if (!field.match(/[ .]/)) {
        field = `_.${field}`;
      }
      return needsAs ? `${field} AS ${quoteAlias(as)}` : `${field}`;
    })
    .join(', ');
}

export function makeViews(schema, schemaConfig) {
  const views = schemaConfig.views;
  const viewStrs = [];

  Object.keys(views).forEach(table => {
    const { fields: fieldMappings = {}, ...tableViews } = views[table];

    const publicFields = Object.fromEntries(
      Object.keys(schema[table]).map(name => [name, name]),
    );
    const internalFields = { ...publicFields, ...fieldMappings };

    Object.keys(tableViews).forEach(viewName => {
      const publicMaker = overrides => {
        const fields = { ...publicFields, ...overrides };
        return selectFields(fields);
      };
      const internalMaker = overrides => {
        const fields = { ...internalFields, ...overrides };
        return selectFields(fields);
      };

      let sql;
      if (typeof tableViews[viewName] === 'function') {
        sql = tableViews[viewName](internalMaker, publicMaker);
      } else {
        sql = tableViews[viewName];
      }
      sql = sql.trim().replace(/;$/, '');

      viewStrs.push(`
        DROP VIEW IF EXISTS ${viewName};
        CREATE VIEW ${viewName} AS ${sql};
      `);
    });
  });

  return viewStrs.join('\n');
}
