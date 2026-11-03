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
import type { SVGProps } from 'react';

import { css, keyframes } from '@emotion/css';

import { SvgLoading } from './Loading';

const rotation = keyframes({
  '0%': { transform: 'rotate(-90deg)' },
  '100%': { transform: 'rotate(666deg)' },
});

export function AnimatedLoading(props: SVGProps<SVGSVGElement>) {
  return (
    <span
      className={css({
        animationName: rotation,
        animationDuration: '1.6s',
        animationTimingFunction: 'cubic-bezier(0.17, 0.67, 0.83, 0.67)',
        animationIterationCount: 'infinite',
        lineHeight: 0,
      })}
    >
      <SvgLoading {...props} />
    </span>
  );
}
