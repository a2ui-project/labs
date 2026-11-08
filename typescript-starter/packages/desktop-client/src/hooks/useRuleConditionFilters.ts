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

import {useCallback, useMemo, useState} from 'react';

import type {RuleConditionEntity} from '@actual-app/core/types/models';

export function useRuleConditionFilters<T extends RuleConditionEntity>(
  initialConditions: T[] = [],
  initialConditionsOp: 'and' | 'or' = 'and',
) {
  const [conditions, setConditions] = useState<T[]>(initialConditions);
  const [conditionsOp, setConditionsOp] = useState<'and' | 'or'>(initialConditionsOp);
  const [saved, setSaved] = useState<T[] | null>(null);

  const onApply = useCallback(
    (
      conditionsOrSavedFilter:
        | null
        | {conditions: T[]; conditionsOp: 'and' | 'or'; id: T[] | null}
        | T,
    ) => {
      if (conditionsOrSavedFilter === null) {
        setConditions([]);
        setSaved(null);
      } else if ('conditions' in conditionsOrSavedFilter) {
        setConditions([...conditionsOrSavedFilter.conditions]);
        setConditionsOp(conditionsOrSavedFilter.conditionsOp);
        setSaved(conditionsOrSavedFilter.id);
      } else {
        setConditions(state => [...state, conditionsOrSavedFilter]);
        setSaved(null);
      }
    },
    [setConditions],
  );

  const onUpdate = useCallback(
    (oldFilter: T, updatedFilter: T) => {
      setConditions(state => state.map(f => (f === oldFilter ? updatedFilter : f)));
      setSaved(null);
    },
    [setConditions],
  );

  const onDelete = useCallback(
    (deletedFilter: T) => {
      setConditions(state => state.filter(f => f !== deletedFilter));
      setSaved(null);
    },
    [setConditions],
  );

  return useMemo(
    () => ({
      conditions,
      saved,
      conditionsOp,
      onApply,
      onUpdate,
      onDelete,
      onConditionsOpChange: setConditionsOp,
    }),
    [conditions, saved, onApply, onUpdate, onDelete, setConditionsOp, conditionsOp],
  );
}
