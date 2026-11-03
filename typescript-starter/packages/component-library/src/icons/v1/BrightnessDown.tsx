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
export const SvgBrightnessDown = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path
      d="M10 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6M9 4a1 1 0 1 1 2 0 1 1 0 1 1-2 0m4.54 1.05a1 1 0 1 1 1.41 1.41 1 1 0 1 1-1.41-1.41M16 9a1 1 0 1 1 0 2 1 1 0 1 1 0-2m-1.05 4.54a1 1 0 1 1-1.41 1.41 1 1 0 1 1 1.41-1.41M11 16a1 1 0 1 1-2 0 1 1 0 1 1 2 0m-4.54-1.05a1 1 0 1 1-1.41-1.41 1 1 0 1 1 1.41 1.41M4 11a1 1 0 1 1 0-2 1 1 0 1 1 0 2m1.05-4.54a1 1 0 1 1 1.41-1.41 1 1 0 1 1-1.41 1.41"
      fill="currentColor"
    />
  </svg>
);
