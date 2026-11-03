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
export const SvgAlertTriangle = (props: SVGProps<SVGSVGElement>) => (
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
      d="M23.119 20 13.772 2.15a2 2 0 0 0-3.543 0L.881 20a2 2 0 0 0 1.772 2.928h18.694A2 2 0 0 0 23.119 20M11 8.423a1 1 0 0 1 2 0v6a1 1 0 1 1-2 0Zm1.05 11.51h-.028a1.53 1.53 0 0 1-1.522-1.47 1.476 1.476 0 0 1 1.448-1.53h.028A1.527 1.527 0 0 1 13.5 18.4a1.475 1.475 0 0 1-1.45 1.533"
      fill="currentColor"
    />
  </svg>
);
