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
export const SvgMoveBack = (props: SVGProps<SVGSVGElement>) => (
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
      d="M5.418 16.414a1 1 0 0 0 1.707-.707v-3.291a.25.25 0 0 1 .25-.25h13.542a.25.25 0 0 1 .25.25v5.208a1.25 1.25 0 0 0 2.5 0v-6.708a1.25 1.25 0 0 0-1.25-1.25H7.375a.25.25 0 0 1-.25-.25V6.124a1 1 0 0 0-1.707-.707L.626 10.209a1 1 0 0 0 0 1.414Z"
      fill="currentColor"
    />
  </svg>
);
