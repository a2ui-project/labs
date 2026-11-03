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
  AverageTemplate,
  ByTemplate,
  CopyTemplate,
  GoalTemplate,
  LimitTemplate,
  PercentageTemplate,
  PeriodicTemplate,
  RefillTemplate,
  RemainderTemplate,
  ScheduleTemplate,
  SpendTemplate,
} from '@actual-app/core/types/models/templates';

export const displayTemplateTypes = [
  'fixed',
  'schedule',
  'by',
  'percentage',
  'historical',
  'limit',
  'refill',
  'remainder',
  'goal',
] as const;

export type DisplayTemplateType = (typeof displayTemplateTypes)[number];

export type ReducerState =
  | {
      template: LimitTemplate;
      displayType: 'limit';
    }
  | {
      template: RefillTemplate;
      displayType: 'refill';
    }
  | {
      template: PeriodicTemplate;
      displayType: 'fixed';
    }
  | {
      template: ScheduleTemplate;
      displayType: 'schedule';
    }
  | {
      template: PercentageTemplate;
      displayType: 'percentage';
    }
  | {
      template: CopyTemplate | AverageTemplate;
      displayType: 'historical';
    }
  | {
      template: ByTemplate | SpendTemplate;
      displayType: 'by';
    }
  | {
      template: RemainderTemplate;
      displayType: 'remainder';
    }
  | {
      template: GoalTemplate;
      displayType: 'goal';
    };
