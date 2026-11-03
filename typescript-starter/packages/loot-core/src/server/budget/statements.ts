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

import * as db from '#server/db';
import type { DbSchedule } from '#server/db';

import { GOAL_PREFIX, TEMPLATE_PREFIX } from './template-notes';

export async function resetCategoryGoalDefsWithNoTemplates(
  categoryIds?: string[],
): Promise<void> {
  if (categoryIds?.length === 0) return;
  const scopeClause = categoryIds
    ? `AND id IN (${categoryIds.map(() => '?').join(',')})`
    : '';
  await db.run(
    `
      UPDATE categories
      SET goal_def = NULL
      WHERE id NOT IN (SELECT n.id
                       FROM notes n
                       WHERE lower(note) LIKE '%${TEMPLATE_PREFIX}%'
                          OR lower(note) LIKE '%${GOAL_PREFIX}%')
        AND COALESCE(JSON_EXTRACT(template_settings, '$.source'), 'notes') <> 'ui'
        ${scopeClause}
    `,
    categoryIds ?? [],
  );
}

export type CategoryWithTemplateNote = {
  id: string;
  name: string;
  note: string;
};

export async function getCategoriesWithTemplateNotes(
  categoryIds?: string[],
): Promise<CategoryWithTemplateNote[]> {
  if (categoryIds?.length === 0) return [];
  const scopeClause = categoryIds
    ? `AND c.id IN (${categoryIds.map(() => '?').join(',')})`
    : '';
  return await db.all<
    Pick<db.DbCategory, 'id' | 'name'> & Pick<db.DbNote, 'note'>
  >(
    `
      SELECT c.id AS id, c.name as name, n.note AS note
      FROM notes n
             JOIN categories c ON n.id = c.id
      WHERE c.id = n.id
        AND c.tombstone = 0
        AND COALESCE(JSON_EXTRACT(c.template_settings, '$.source'), 'notes') <> 'ui'
        AND (lower(note) LIKE '%${TEMPLATE_PREFIX}%'
        OR lower(note) LIKE '%${GOAL_PREFIX}%')
        ${scopeClause}
    `,
    categoryIds ?? [],
  );
}

export async function getActiveSchedules() {
  return await db.all<
    Pick<
      DbSchedule,
      | 'id'
      | 'rule'
      | 'active'
      | 'completed'
      | 'posts_transaction'
      | 'tombstone'
      | 'name'
    >
  >(
    'SELECT id, rule, active, completed, posts_transaction, tombstone, name from schedules WHERE name NOT NULL AND tombstone = 0',
  );
}
