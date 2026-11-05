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
export const SvgCheckAlternative = (props: SVGProps<SVGSVGElement>) => (
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
      d="M18.48 6.449a1.25 1.25 0 0 0-1.747.265l-5.924 8.04-3.767-3.014a1.251 1.251 0 0 0-1.563 1.953l4.783 3.826a1.263 1.263 0 0 0 1.787-.235l6.7-9.087a1.25 1.25 0 0 0-.269-1.748"
      fill="currentColor"
    />
    <path
      d="M12 0a12 12 0 1 0 12 12A12.013 12.013 0 0 0 12 0m0 22a10 10 0 1 1 10-10 10.01 10.01 0 0 1-10 10"
      fill="currentColor"
    />
  </svg>
);
