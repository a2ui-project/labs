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

import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';

import type { Action } from './actions';
import type { ReducerState } from './constants';
import { BySaveAutomation } from './editor/BySaveAutomation';
import { FixedAutomation } from './editor/FixedAutomation';
import { HistoricalAutomation } from './editor/HistoricalAutomation';
import { LimitAutomation } from './editor/LimitAutomation';
import { LongTermGoalAutomation } from './editor/LongTermGoalAutomation';
import { PercentageAutomation } from './editor/PercentageAutomation';
import { RefillAutomation } from './editor/RefillAutomation';
import { RemainderAutomation } from './editor/RemainderAutomation';
import { ScheduleAutomation } from './editor/ScheduleAutomation';

type ActiveEditorProps = {
  state: ReducerState;
  dispatch: (action: Action) => void;
  schedules: readonly ScheduleEntity[];
  categories: CategoryGroupEntity[];
  hasLimitAutomation: boolean;
  onAddLimitAutomation: () => void;
  defaultWeeklyStart: string;
};

export function ActiveEditor({
  state,
  dispatch,
  schedules,
  categories,
  hasLimitAutomation,
  onAddLimitAutomation,
  defaultWeeklyStart,
}: ActiveEditorProps) {
  switch (state.displayType) {
    case 'limit':
      return (
        <LimitAutomation
          template={state.template}
          dispatch={dispatch}
          defaultWeeklyStart={defaultWeeklyStart}
        />
      );
    case 'refill':
      return (
        <RefillAutomation
          hasLimitAutomation={hasLimitAutomation}
          onAddLimitAutomation={onAddLimitAutomation}
        />
      );
    case 'fixed':
      return <FixedAutomation template={state.template} dispatch={dispatch} />;
    case 'schedule':
      return (
        <ScheduleAutomation
          schedules={schedules}
          template={state.template}
          dispatch={dispatch}
        />
      );
    case 'percentage':
      return (
        <PercentageAutomation
          dispatch={dispatch}
          template={state.template}
          categories={categories}
        />
      );
    case 'historical':
      return (
        <HistoricalAutomation template={state.template} dispatch={dispatch} />
      );
    case 'by':
      return <BySaveAutomation template={state.template} dispatch={dispatch} />;
    case 'remainder':
      return (
        <RemainderAutomation template={state.template} dispatch={dispatch} />
      );
    case 'goal':
      return (
        <LongTermGoalAutomation template={state.template} dispatch={dispatch} />
      );
    default:
      state satisfies never;
      return null;
  }
}
