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
export const SvgCalendar = (props: SVGProps<SVGSVGElement>) => (
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
      d="M21.5 3h-2.75a.25.25 0 0 1-.25-.25V1a1 1 0 0 0-2 0v4.75a.75.75 0 0 1-.75.75.75.75 0 0 1-.75-.75V3.5a.5.5 0 0 0-.5-.5H8.25A.25.25 0 0 1 8 2.751V1a1 1 0 1 0-2 0v4.75a.75.75 0 0 1-.75.75.75.75 0 0 1-.75-.75V3.5A.5.5 0 0 0 4 3H2.5a2 2 0 0 0-2 2v17a2 2 0 0 0 2 2h19a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2M21 22H3a.5.5 0 0 1-.5-.5v-12A.5.5 0 0 1 3 9h18a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5"
      fill="currentColor"
    />
  </svg>
);
