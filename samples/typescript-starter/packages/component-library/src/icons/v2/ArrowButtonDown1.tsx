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
export const SvgArrowButtonDown1 = (props: SVGProps<SVGSVGElement>) => (
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
      d="M12 13.584a2.64 2.64 0 0 1-1.875-.775L.584 3.268a1.768 1.768 0 0 1 2.5-2.5l8.739 8.739a.25.25 0 0 0 .354 0L20.916.768a1.768 1.768 0 0 1 2.5 2.5l-9.541 9.541a2.64 2.64 0 0 1-1.875.775"
      fill="currentColor"
    />
    <path
      d="M12 23.75a2.64 2.64 0 0 1-1.875-.775L.584 13.434a1.768 1.768 0 0 1 2.5-2.5l8.739 8.739a.25.25 0 0 0 .354 0l8.739-8.739a1.768 1.768 0 0 1 2.5 2.5l-9.541 9.541A2.64 2.64 0 0 1 12 23.75"
      fill="currentColor"
    />
  </svg>
);
