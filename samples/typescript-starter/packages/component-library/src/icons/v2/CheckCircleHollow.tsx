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
export const SvgCheckCircleHollow = (props: SVGProps<SVGSVGElement>) => (
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
      d="M12 0C1.308 0-4.044 12.925 3.516 20.484 11.075 28.044 24 22.692 24 12 23.992 5.376 18.624.008 12 0m.01 1.988c5.521.007 9.995 4.48 10.002 10.002 0 8.912-10.774 13.373-17.074 7.073-6.301-6.301-1.84-17.075 7.072-17.075m6.234 4.588a1 1 0 0 0-.928.442l-6.226 8.45-4.076-3.261a1 1 0 1 0-1.25 1.563l4.888 3.908a1.01 1.01 0 0 0 1.43-.19L18.928 8.2a1 1 0 0 0-.684-1.623"
      fill="currentColor"
    />
  </svg>
);
