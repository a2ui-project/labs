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

import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';
import {css, keyframes} from '@emotion/css';

import {useReducedMotion} from '#hooks/useReducedMotion';

const pulse = keyframes({
  '0%, 100%': {opacity: 0.4},
  '50%': {opacity: 1},
});

const cellBase = {
  borderRadius: 4,
  backgroundColor: theme.calendarCellBackground,
};

const staticCell = css({...cellBase, opacity: 0.7});
const pulsingCell = css({
  ...cellBase,
  animationName: pulse,
  animationDuration: '1.6s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
});

export function CalendarCardSkeleton() {
  const reducedMotion = useReducedMotion();
  const cell = reducedMotion ? staticCell : pulsingCell;
  return (
    <View style={{flex: 1, gap: 4}} aria-hidden="true">
      <View
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
        }}
      >
        {Array.from({length: 7}, (_, i) => (
          <View key={i} style={{alignItems: 'center', padding: '3px 0'}}>
            <div
              className={cell}
              style={{
                width: 14,
                height: 10,
                backgroundColor: theme.pageTextSubdued,
              }}
            />
          </View>
        ))}
      </View>
      <View
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: 'repeat(6, 1fr)',
          gap: 2,
        }}
      >
        {Array.from({length: 42}, (_, i) => (
          <div
            key={i}
            className={cell}
            // stagger the pulse diagonally
            style={{
              animationDelay: `${((i % 7) + Math.floor(i / 7)) * 0.04}s`,
            }}
          />
        ))}
      </View>
    </View>
  );
}
