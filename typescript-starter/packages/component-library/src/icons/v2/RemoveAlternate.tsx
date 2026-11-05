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
export const SvgRemoveAlternate = (props: SVGProps<SVGSVGElement>) => (
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
      d="M17.666 6.333a1.25 1.25 0 0 0-1.768 0l-3.722 3.722a.25.25 0 0 1-.353 0L8.1 6.333A1.25 1.25 0 1 0 6.333 8.1l3.722 3.722a.25.25 0 0 1 0 .354L6.333 15.9a1.25 1.25 0 0 0 0 1.768 1.27 1.27 0 0 0 1.768 0l3.722-3.722a.25.25 0 0 1 .353 0l3.724 3.72a1.27 1.27 0 0 0 1.768 0 1.25 1.25 0 0 0 0-1.768l-3.722-3.722a.25.25 0 0 1 0-.354l3.72-3.722a1.25 1.25 0 0 0 0-1.767"
      fill="currentColor"
    />
    <path
      d="M12 0a12 12 0 1 0 12 12A12.013 12.013 0 0 0 12 0m0 22a10 10 0 1 1 10-10 10.01 10.01 0 0 1-10 10"
      fill="currentColor"
    />
  </svg>
);
