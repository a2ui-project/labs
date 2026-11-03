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

import React from 'react';

import { theme } from '@actual-app/components/theme';

import { LoadComponent } from './util/LoadComponent';

export function Background() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.pageBackground,
      }}
    >
      <svg
        viewBox="0 0 642 535"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
        }}
      >
        <path fill="url(#paint0_linear)" d="M0 0h642v535H0z" />
        <defs>
          <linearGradient
            id="paint0_linear"
            x1="162"
            y1="23.261"
            x2="468.904"
            y2="520.44"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={theme.pageBackgroundTopLeft} />
            <stop
              offset="1"
              stopColor={theme.pageBackgroundBottomRight}
              stopOpacity="0.5"
            />
          </linearGradient>
        </defs>
        <LoadComponent
          importer={() => import('./BackgroundImage')}
          name="BackgroundImage"
        />
      </svg>
    </div>
  );
}
