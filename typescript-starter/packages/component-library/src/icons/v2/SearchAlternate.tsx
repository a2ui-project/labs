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
import type {SVGProps} from 'react';
export const SvgSearchAlternate = (props: SVGProps<SVGSVGElement>) => (
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
      d="m23.384 21.619-6.529-6.529a9.284 9.284 0 1 0-1.768 1.768l6.529 6.529a1.266 1.266 0 0 0 1.768 0 1.25 1.25 0 0 0 0-1.768M2.75 9.5a6.75 6.75 0 1 1 6.75 6.75A6.76 6.76 0 0 1 2.75 9.5"
      fill="currentColor"
    />
  </svg>
);
