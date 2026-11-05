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

import {SpaceBetween} from '@actual-app/components/space-between';
import {View} from '@actual-app/components/view';
import type {RuleConditionEntity, TransactionFilterEntity} from '@actual-app/core/types/models';

import {AppliedFilters} from './AppliedFilters';
import {SavedFilterMenuButton} from './SavedFilterMenuButton';
import type {SavedFilter} from './SavedFilterMenuButton';

export function FiltersStack({
  conditions,
  conditionsOp,
  onUpdateFilter,
  onDeleteFilter,
  onClearFilters,
  onReloadSavedFilter,
  filterId,
  savedFilters,
  onConditionsOpChange,
}: {
  conditions: RuleConditionEntity[];
  conditionsOp: 'and' | 'or';
  onUpdateFilter: (filter: RuleConditionEntity, newFilter: RuleConditionEntity) => void;
  onDeleteFilter: (filter: RuleConditionEntity) => void;
  onClearFilters: () => void;
  onReloadSavedFilter: (savedFilter: SavedFilter, value?: string) => void;
  filterId?: SavedFilter;
  savedFilters: TransactionFilterEntity[];
  onConditionsOpChange: (value: 'and' | 'or') => void;
}) {
  return (
    <View>
      <SpaceBetween
        direction="horizontal"
        gap={10}
        style={{justifyContent: 'flex-start', alignItems: 'flex-start'}}
      >
        <AppliedFilters
          conditions={conditions}
          conditionsOp={conditionsOp}
          onConditionsOpChange={onConditionsOpChange}
          onUpdate={onUpdateFilter}
          onDelete={onDeleteFilter}
        />
        <View style={{flex: 1}} />
        <SavedFilterMenuButton
          conditions={conditions}
          conditionsOp={conditionsOp}
          filterId={filterId}
          onClearFilters={onClearFilters}
          onReloadSavedFilter={onReloadSavedFilter}
          savedFilters={savedFilters}
        />
      </SpaceBetween>
    </View>
  );
}
