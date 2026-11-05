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

import React from 'react';

import {theme} from '@actual-app/components/theme';
import type {TagEntity} from '@actual-app/core/types/models';

import {Table} from '#components/table';
import type {TableNavigator} from '#components/table';

import {TagRow} from './TagRow';

type TagsListProps = {
  navigator: TableNavigator<TagEntity>;
  tags: TagEntity[];
  hoveredTag?: string;
  onHover: (id?: string) => void;
};

export function TagsList({navigator, tags, hoveredTag, onHover}: TagsListProps) {
  return (
    <Table
      navigator={navigator}
      items={tags}
      backgroundColor={theme.tableBackground}
      renderItem={({item: tag, focusedField, onEdit}) => {
        const hovered = hoveredTag === tag.id;

        return (
          <TagRow
            key={tag.id}
            tag={tag}
            hovered={hovered}
            onHover={onHover}
            focusedField={focusedField}
            onEdit={onEdit}
          />
        );
      }}
    />
  );
}
