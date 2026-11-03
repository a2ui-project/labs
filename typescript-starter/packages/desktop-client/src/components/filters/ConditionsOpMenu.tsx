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

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { RuleConditionEntity } from '@actual-app/core/types/models';

import { FieldSelect } from '#components/rules/RuleEditor';

export function ConditionsOpMenu({
  conditionsOp,
  onChange,
  conditions,
}: {
  conditionsOp: 'and' | 'or';
  onChange: (value: 'and' | 'or') => void;
  conditions: RuleConditionEntity[];
}) {
  return conditions.length > 1 ? (
    <Text style={{ color: theme.pageText, marginTop: 11, marginRight: 5 }}>
      <FieldSelect
        style={{ display: 'inline-flex' }}
        fields={[
          ['and', 'all'],
          ['or', 'any'],
        ]}
        value={conditionsOp}
        onChange={onChange}
      />
      of:
    </Text>
  ) : (
    <View />
  );
}
