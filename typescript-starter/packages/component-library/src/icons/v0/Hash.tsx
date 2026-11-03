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

import * as React from 'react';
import type { SVGProps } from 'react';
export const SvgHash = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path fill="none" d="M0 0h24v24H0z" />
    <g
      fill="none"
      stroke="currentColor"
      strokeDashoffset={0}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <g strokeDasharray={20}>
        <path d="M4 9h17M3 15h17" fill="currentColor" />
      </g>
      <g strokeDasharray={22}>
        <path d="M10 3 8 21M16 3l-2 18" fill="currentColor" />
      </g>
    </g>
  </svg>
);
