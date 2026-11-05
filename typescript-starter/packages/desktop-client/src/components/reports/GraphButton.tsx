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
import type {CSSProperties, HTMLProps} from 'react';

import {Button} from '@actual-app/components/button';
import {styles} from '@actual-app/components/styles';
import {Text} from '@actual-app/components/text';
import {theme} from '@actual-app/components/theme';
import {Tooltip} from '@actual-app/components/tooltip';

type GraphButtonProps = HTMLProps<HTMLButtonElement> & {
  selected?: boolean;
  style?: CSSProperties;
  onSelect?: () => void;
  title?: string;
  disabled?: boolean;
};

export const GraphButton = ({
  selected,
  children,
  onSelect,
  title,
  style,
  disabled,
}: GraphButtonProps) => {
  return (
    <Tooltip
      placement="bottom start"
      content={<Text>{title}</Text>}
      style={{...styles.tooltip, lineHeight: 1.5, padding: '6px 10px'}}
    >
      <Button
        variant="bare"
        style={{
          ...(selected && {
            backgroundColor: theme.buttonBareBackgroundHover,
          }),
          ...style,
        }}
        onPress={onSelect}
        isDisabled={disabled}
        aria-label={title}
      >
        {children}
      </Button>
    </Tooltip>
  );
};
