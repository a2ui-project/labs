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
export const SvgSum = (props: SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    xmlSpace="preserve"
    x={0}
    y={0}
    baseProfile="basic"
    viewBox="0 0 28.3 28.3"
    style={{
      color: 'inherit',
      ...props.style,
    }}
  >
    <path
      d="M23.2 10.1c1.1 0 2-.9 2-2V2.2c0-1.1-.9-2-2-2h-18c-1.1 0-2 .9-2 2 0 .4.1.9.4 1.2l8.1 10.8L3.6 25c-.7.9-.5 2.1.4 2.8.3.3.8.4 1.2.4h18c1.1 0 2-.9 2-2v-5.8c0-1.1-.9-2-2-2s-2 .9-2 2v3.8h-12l6.6-8.8c.5-.7.5-1.7 0-2.4L9.2 4.2h12v3.9c0 1.1.9 2 2 2"
      fill="currentColor"
    />
  </svg>
);
