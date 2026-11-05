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

import {describe, expect, it, vi} from 'vitest';

import {getTourSteps} from './steps';
import type {TourStepDeps} from './steps';

const deps: TourStepDeps = {navigate: vi.fn(), budgetType: 'envelope'};

describe('getTourSteps', () => {
  it('returns a tour that starts with a centered welcome step', () => {
    const steps = getTourSteps('budget-tour', deps);

    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].id).toBe('welcome');
    expect(steps[0].placement).toBe('center');
  });

  it('gives every step a unique id, a target, and content', () => {
    const steps = getTourSteps('budget-tour', deps);

    const ids = steps.map(step => step.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const step of steps) {
      expect(step.id).toBeTruthy();
      expect(step.target).toBeTruthy();
      expect(step.content).toBeTruthy();
      expect(step.title).toBeTruthy();
    }
  });

  it.each(['envelope', 'tracking'] as const)(
    'returns a complete tour for %s budgets',
    budgetType => {
      const steps = getTourSteps('budget-tour', {...deps, budgetType});

      const summaryStep = steps.find(step => step.id === 'budget-summary');
      expect(summaryStep?.title).toBeTruthy();
      expect(summaryStep?.content).toBeTruthy();
      expect(summaryStep?.target).toBeTruthy();
    },
  );
});
