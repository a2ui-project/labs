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
export const SvgExpandArrow = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 25 15"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path
      fill="currentColor"
      d="M24.483.576q-.463-.49-1.097-.49H1.56q-.633 0-1.096.49A1.64 1.64 0 0 0 0 1.737q0 .671.463 1.161l10.913 11.558q.465.49 1.097.49.633 0 1.096-.49L24.483 2.898q.462-.49.463-1.16 0-.672-.463-1.162"
    />
  </svg>
);
