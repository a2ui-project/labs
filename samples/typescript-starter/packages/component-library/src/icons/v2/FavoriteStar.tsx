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
export const SvgFavoriteStar = (props: SVGProps<SVGSVGElement>) => (
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
      fill="currentColor"
      d="M23.91 9.113a1.79 1.79 0 0 0-1.453-1.227l-6.132-.926-2.714-5.506a1.863 1.863 0 0 0-3.222 0l-2.78 5.552-6.066.88a1.798 1.798 0 0 0-1 3.068l4.428 4.361-1.028 6.055a1.797 1.797 0 0 0 2.607 1.895l5.488-2.865 5.429 2.858a1.797 1.797 0 0 0 2.607-1.895l-1.011-6.128 4.394-4.286a1.79 1.79 0 0 0 .454-1.836"
    />
  </svg>
);
