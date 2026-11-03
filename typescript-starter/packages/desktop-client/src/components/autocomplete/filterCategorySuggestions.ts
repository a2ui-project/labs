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

import { Fzf } from 'fzf';

type CategorySuggestion = {
  id: string;
  name: string;
  group?: { name: string };
};

function rankMatches<T extends CategorySuggestion>(
  items: T[],
  value: string,
  selector: (item: CategorySuggestion) => string,
): T[] {
  const itemsById = new Map(items.map(item => [item.id, item]));
  return new Fzf<CategorySuggestion[]>(items, {
    selector,
    limit: 100,
    casing: 'case-insensitive',
  })
    .find(value)
    .map(result => itemsById.get(result.item.id))
    .filter(item => item != null);
}

export function filterCategorySuggestions<T extends CategorySuggestion>(
  suggestions: T[],
  value: string,
): T[] {
  const splitItem = suggestions.find(s => s.id === 'split');
  const realSuggestions = suggestions.filter(s => s.id !== 'split');

  if (!value) {
    return suggestions;
  }

  // matches on the category name itself rank above matches that
  // only hit the group name
  const nameMatches = rankMatches(realSuggestions, value, item => item.name);

  const nameMatchIds = new Set(nameMatches.map(item => item.id));
  const groupMatches = rankMatches(
    realSuggestions.filter(item => !nameMatchIds.has(item.id)),
    value,
    item => (item.group ? item.group.name + ' ' + item.name : item.name),
  );

  const filtered = [...nameMatches, ...groupMatches].slice(0, 100);

  return splitItem ? [splitItem, ...filtered] : filtered;
}
