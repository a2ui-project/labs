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
export const SvgChartArea = (props: SVGProps<SVGSVGElement>) => (
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
      d="M2.5 13c-.5.5-.5.5-.5 1v1c0 1 0 1 1 1h14c1 0 1 0 1-1V8.5c0-.5 0-.5-.5-1L16 6c-.5-.4-.5-.4-1 0l-4 4c-.5.25-.5.25-1 0L8 9c-.5-.3-.5-.3-1 0zM0 5c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4z"
      fill="currentColor"
    />
  </svg>
);
