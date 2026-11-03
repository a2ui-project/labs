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
import type { CSSProperties } from 'react';

import { css } from '@emotion/css';

import { theme } from './theme';
import { View } from './View';

type ToggleProps = {
  id: string;
  isOn: boolean;
  isDisabled?: boolean;
  onToggle?: (isOn: boolean) => void;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
};

export const Toggle = ({
  id,
  isOn,
  isDisabled = false,
  onToggle,
  className,
  style,
  'aria-label': ariaLabel,
}: ToggleProps) => {
  return (
    <View style={style} className={className}>
      <input
        id={id}
        aria-label={ariaLabel}
        checked={isOn}
        disabled={isDisabled}
        onChange={e => onToggle?.(e.target.checked)}
        className={css({
          height: 0,
          width: 0,
          visibility: 'hidden',
        })}
        type="checkbox"
      />
      {/* oxlint-disable-next-line eslint-plugin-jsx-a11y(label-has-associated-control) */}
      <label
        data-toggle-container
        data-on={isOn}
        className={String(
          css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            width: '32px',
            height: '16px',
            borderRadius: '100px',
            position: 'relative',
            transition: 'background-color .2s',
            backgroundColor: isOn
              ? theme.checkboxToggleBackgroundSelected
              : theme.checkboxToggleBackground,
          }),
        )}
        htmlFor={id}
      >
        <span
          data-toggle
          data-on={isOn}
          className={css(
            {
              content: '" "',
              position: 'absolute',
              top: '2px',
              left: '2px',
              width: '12px',
              height: '12px',
              borderRadius: '100px',
              transition: '0.2s',
              boxShadow: '0 0 2px 0 rgba(10, 10, 10, 0.29)',
              backgroundColor: isDisabled
                ? theme.checkboxToggleDisabled
                : '#fff',
            },
            isOn && {
              left: 'calc(100% - 2px)',
              transform: 'translateX(-100%)',
            },
          )}
        />
      </label>
    </View>
  );
};
