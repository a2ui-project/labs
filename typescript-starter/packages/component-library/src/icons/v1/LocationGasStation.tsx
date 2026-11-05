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
export const SvgLocationGasStation = (props: SVGProps<SVGSVGElement>) => (
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
      d="M13 18h1v2H0v-2h1V2c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2zM3 2v6h8V2zm10 8h1a2 2 0 0 1 2 2v3a1 1 0 0 0 2 0v-5l-2-2V6l-2-2 1-1 5 5v7a3 3 0 0 1-6 0v-3h-1z"
      fill="currentColor"
    />
  </svg>
);
