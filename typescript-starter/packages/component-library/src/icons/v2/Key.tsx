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
export const SvgKey = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path
      d="M23.113 5.954 21.849 4.69l.881-.88a1.914 1.914 0 1 0-2.707-2.71L9.04 12.085a6.014 6.014 0 1 0 2.707 2.707l3.739-3.737.762.762a1.75 1.75 0 1 0 2.475-2.475l-.763-.762 1.416-1.417 1.264 1.263a1.79 1.79 0 0 0 2.473 0 1.75 1.75 0 0 0 0-2.472m-16.737 8.5a3 3 0 1 1-3 3 3 3 0 0 1 3-2.998Z"
      fill="currentColor"
    />
  </svg>
);
