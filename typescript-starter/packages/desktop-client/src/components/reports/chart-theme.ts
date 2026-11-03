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

import { useMemo } from 'react';

import { useReducedMotion } from '#hooks/useReducedMotion';

export function getColorScale(name: string): string[] {
  const scales: Record<string, string[]> = {
    qualitative: [
      'var(--color-chartQual1)', // Dark Teal
      'var(--color-chartQual2)', // Yellow
      'var(--color-chartQual3)', // Orange
      'var(--color-chartQual4)', // Light Red
      'var(--color-chartQual5)', // Blue
      'var(--color-chartQual6)', // Peach
      'var(--color-chartQual7)', // Light Teal
      'var(--color-chartQual8)', // Light Yellow
      'var(--color-chartQual9)', // Light Red
    ],
  };
  return name ? scales[name] : scales.qualitative;
}

export function useRechartsAnimation(defaults?: {
  animationDuration?: number;
  isAnimationActive?: boolean;
}) {
  const reducedMotion = useReducedMotion();

  const isAnimationActive = reducedMotion
    ? false
    : (defaults?.isAnimationActive ?? true);
  const animationDuration = reducedMotion ? 0 : defaults?.animationDuration;

  // The returned object must be referentially stable: recharts re-runs chart
  // animations (hiding labels while animating) whenever element identity
  // changes, and this file is outside the React Compiler's *.tsx include, so
  // it isn't auto-memoized.
  return useMemo(
    () => ({ isAnimationActive, animationDuration }),
    [isAnimationActive, animationDuration],
  );
}
