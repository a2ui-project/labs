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
import React from 'react';

import {View} from '@actual-app/components/view';
import type {RuleEntity} from '@actual-app/core/types/models';

import {RuleRow} from './RuleRow';

type RulesListProps = {
  rules: RuleEntity[];
  selectedItems: Set<string>;
  hoveredRule?: string;
  onHover?: (id: string | null) => void;
  onEditRule?: (rule: RuleEntity) => void;
  onDeleteRule?: (rule: RuleEntity) => void;
};

export function RulesList({
  rules,
  selectedItems,
  hoveredRule,
  onHover,
  onEditRule,
  onDeleteRule,
}: RulesListProps) {
  if (rules.length === 0) {
    return null;
  }

  return (
    <View>
      {rules.map(rule => {
        const hovered = hoveredRule === rule.id;
        const selected = selectedItems.has(rule.id);

        return (
          <RuleRow
            key={rule.id}
            rule={rule}
            hovered={hovered}
            selected={selected}
            onHover={onHover}
            onEditRule={onEditRule}
            onDeleteRule={onDeleteRule}
          />
        );
      })}
    </View>
  );
}
