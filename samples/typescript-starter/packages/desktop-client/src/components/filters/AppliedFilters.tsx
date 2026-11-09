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

import type {CSSProperties} from '@actual-app/components/styles';
import {View} from '@actual-app/components/view';
import type {RuleConditionEntity} from '@actual-app/core/types/models';

import {ConditionsOpMenu} from './ConditionsOpMenu';
import {FilterExpression} from './FilterExpression';

type AppliedFiltersProps = {
  conditions: RuleConditionEntity[];
  onUpdate: (filter: RuleConditionEntity, newFilter: RuleConditionEntity) => void;
  onDelete: (filter: RuleConditionEntity) => void;
  conditionsOp: 'and' | 'or';
  onConditionsOpChange: (value: 'and' | 'or') => void;
  style?: CSSProperties;
};

export function AppliedFilters({
  conditions,
  onUpdate,
  onDelete,
  conditionsOp,
  onConditionsOpChange,
  style = {},
}: AppliedFiltersProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      <ConditionsOpMenu
        conditionsOp={conditionsOp}
        onChange={onConditionsOpChange}
        conditions={conditions}
      />
      {conditions.map((filter: RuleConditionEntity, i: number) => (
        <FilterExpression
          key={i}
          customName={filter.customName}
          field={filter.field}
          op={filter.op}
          value={filter.value}
          options={filter.options}
          onChange={newFilter => onUpdate(filter, newFilter)}
          onDelete={() => onDelete(filter)}
        />
      ))}
    </View>
  );
}
