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
import { batchMessages } from '#server/sync';
import type { CategoryGroupEntity } from '#types/models';

export async function sortCategories({
  groupId,
  direction,
}: {
  groupId: CategoryGroupEntity['id'];
  direction: 'asc' | 'desc';
}): Promise<void> {
  const groups = await db.getCategoriesGrouped();
  const group = groups.find(g => g.id === groupId);
  if (!group?.categories?.length) return;

  const sorted = [...group.categories].sort((a, b) =>
    direction === 'asc'
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name),
  );

  for (let i = sorted.length - 1; i >= 0; i--) {
    await batchMessages(async () => {
      await db.moveCategory(
        sorted[i].id,
        groupId,
        i === sorted.length - 1 ? null : sorted[i + 1].id,
      );
    });
  }
}
