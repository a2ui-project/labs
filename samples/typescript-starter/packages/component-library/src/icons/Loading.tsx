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

import React, {useState} from 'react';
import type {SVGProps} from 'react';

export const SvgLoading = (props: SVGProps<SVGSVGElement>) => {
  const {color = 'currentColor'} = props;
  const [gradientId] = useState('gradient-' + Math.random());

  return (
    <svg {...props} viewBox="0 0 38 38" style={{...props.style}}>
      <defs>
        <linearGradient x1="8.042%" y1="0%" x2="65.682%" y2="23.865%" id={gradientId}>
          <stop stopColor={color} stopOpacity={0} offset="0%" />
          <stop stopColor={color} stopOpacity={0.631} offset="63.146%" />
          <stop stopColor={color} offset="100%" />
        </linearGradient>
      </defs>
      <g transform="translate(1 2)" fill="none" fillRule="evenodd">
        <path
          d="M36 18c0-9.94-8.06-18-18-18"
          stroke={'url(#' + gradientId + ')'}
          strokeWidth={2}
          fill="none"
        />
        <circle fill={color} cx={36} cy={18} r={1} />
      </g>
    </svg>
  );
};
