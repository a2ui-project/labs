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
export const SvgTextBox = (props: SVGProps<SVGSVGElement>) => (
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
      d="M0 0h6v6H0zm2 2v2h2V2zm12-2h6v6h-6zm2 2v2h2V2zm-2 12h6v6h-6zm2 2v2h2v-2zM0 14h6v6H0zm2 2v2h2v-2zM6 2h8v2H6zm0 14h8v2H6zM16 6h2v8h-2zM2 6h2v8H2zm5 1h6v2H7zm2 2h2v4H9z"
      fill="currentColor"
    />
  </svg>
);
