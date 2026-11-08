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

import type {HTMLProps} from 'react';

import {css} from '@emotion/css';

import type {CSSProperties} from './styles';

type ParagraphProps = Omit<HTMLProps<HTMLDivElement>, 'style'> & {
  style?: CSSProperties;
  isLast?: boolean;
};

export function Paragraph({style, isLast, children, ...props}: ParagraphProps) {
  return (
    <div
      {...props}
      className={css([
        !isLast && {marginBottom: 15},
        style,
        {
          lineHeight: '1.5em',
        },
      ])}
    >
      {children}
    </div>
  );
}
