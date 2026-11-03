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

import React, { forwardRef } from 'react';
import type { HTMLProps, Ref } from 'react';

import { css, cx } from '@emotion/css';

import type { CSSProperties } from './styles';

export const viewStyles = css({
  alignItems: 'stretch',
  borderWidth: 0,
  borderStyle: 'solid',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  margin: 0,
  padding: 0,
  position: 'relative',
  /* fix flexbox bugs */
  minHeight: 0,
  minWidth: 0,
});

type ViewProps = Omit<HTMLProps<HTMLDivElement>, 'style'> & {
  className?: string;
  style?: CSSProperties;
  nativeStyle?: CSSProperties;
  innerRef?: Ref<HTMLDivElement>;
};

export const View = forwardRef<HTMLDivElement, ViewProps>((props, ref) => {
  const { className = '', style, nativeStyle, innerRef, ...restProps } = props;

  return (
    <div
      {...restProps}
      ref={innerRef ?? ref}
      style={nativeStyle}
      className={cx(
        viewStyles,
        className,
        style && Object.keys(style).length > 0 ? css(style) : undefined,
      )}
    />
  );
});

View.displayName = 'View';
