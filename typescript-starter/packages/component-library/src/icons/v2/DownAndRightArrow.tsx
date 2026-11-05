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
export const SvgDownAndRightArrow = (props: SVGProps<SVGSVGElement>) => (
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
      d="M4.092 3.658 1.267 6.484l.708.708.708.708 1.609-1.608L5.9 4.684V7.4c.001 2.838.022 3.466.132 3.96.393 1.766 1.732 2.972 3.985 3.59.238.065.53.133.65.151.119.018 1.229.055 2.466.082s2.458.06 2.712.072l.462.021-1.561 1.562-1.562 1.562.708.708.708.708 2.7-2.699 2.7-2.7v-.5l-2.7-2.7-2.7-2.7-.7.7-.7.699 1.675 1.679 1.675 1.678-.617-.019c-.339-.011-1.584-.043-2.766-.071-1.191-.028-2.232-.067-2.334-.087a7 7 0 0 1-1.283-.426c-.754-.356-1.201-.777-1.447-1.365-.167-.399-.17-.463-.17-3.649V4.684L9.55 6.3l1.617 1.616.708-.708.708-.708L9.75 3.667 6.917.833z"
      fill="currentColor"
    />
  </svg>
);
