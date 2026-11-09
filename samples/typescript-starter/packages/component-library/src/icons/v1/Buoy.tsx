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
export const SvgBuoy = (props: SVGProps<SVGSVGElement>) => (
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
      d="M17.16 6.42a8.03 8.03 0 0 0-3.58-3.58l-1.34 2.69a5.02 5.02 0 0 1 2.23 2.23zm0 7.16-2.69-1.34a5.02 5.02 0 0 1-2.23 2.23l1.34 2.69a8.03 8.03 0 0 0 3.58-3.58M6.42 2.84a8.03 8.03 0 0 0-3.58 3.58l2.69 1.34a5.02 5.02 0 0 1 2.23-2.23zM2.84 13.58a8.03 8.03 0 0 0 3.58 3.58l1.34-2.69a5.02 5.02 0 0 1-2.23-2.23zM10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20m0-7a3 3 0 1 0 0-6 3 3 0 0 0 0 6"
      fill="currentColor"
    />
  </svg>
);
