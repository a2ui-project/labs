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

type PieProgressProps = {
  style?: SVGProps<SVGSVGElement>['style'];
  progress: number;
  color: string;
  backgroundColor: string;
};
export function PieProgress({
  style,
  progress,
  color,
  backgroundColor,
}: PieProgressProps) {
  const radius = 4;
  const circum = 2 * Math.PI * radius;
  const dash = progress * circum;
  const gap = circum;

  return (
    <svg viewBox="0 0 20 20" style={style}>
      <circle r="10" cx="10" cy="10" fill={backgroundColor} />
      <circle
        r={radius}
        cx="10"
        cy="10"
        fill="none"
        stroke={color}
        strokeWidth={radius * 2}
        strokeDasharray={`${dash} ${gap}`}
        transform="rotate(-90) translate(-20)"
      />{' '}
    </svg>
  );
}
