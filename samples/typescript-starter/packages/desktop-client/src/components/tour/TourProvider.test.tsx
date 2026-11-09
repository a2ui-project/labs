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

import type {ReactNode} from 'react';

import {act, renderHook} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {TourProvider, useTour} from './TourProvider';

function wrapper({children}: {children: ReactNode}) {
  return <TourProvider>{children}</TourProvider>;
}

describe('TourProvider', () => {
  it('starts and stops the tour', () => {
    const {result} = renderHook(() => useTour(), {wrapper});

    expect(result.current.activeTourId).toBeNull();

    act(() => result.current.startTour());
    expect(result.current.activeTourId).toBe('budget-tour');

    act(() => result.current.stopTour());
    expect(result.current.activeTourId).toBeNull();
  });

  it('does not start the tour on narrow screens', () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 400;
    try {
      const {result} = renderHook(() => useTour(), {wrapper});

      act(() => result.current.startTour());
      expect(result.current.activeTourId).toBeNull();
    } finally {
      window.innerWidth = originalWidth;
    }
  });
});
