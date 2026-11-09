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
  '0%, 100%': {opacity: 0.15},
  '50%': {opacity: 0.4},
});

const barBase = {
  width: '55%',
  maxWidth: 160,
  height: 32,
  borderRadius: 6,
  backgroundColor: theme.pageText,
};

const staticBar = css({...barBase, opacity: 0.25});
const pulsingBar = css({
  ...barBase,
  animationName: pulse,
  animationDuration: '1.4s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
});

export function ReportCardValueSkeleton() {
  const reducedMotion = useReducedMotion();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <div aria-hidden="true" className={reducedMotion ? staticBar : pulsingBar} />
    </View>
  );
}
