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
import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@actual-app/components/button';
import type { CSSProperties } from '@actual-app/components/styles';
import type { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';

type ItemContentProps = {
  style: ComponentProps<typeof View>['style'];
  to: string;
  onClick: ComponentProps<typeof Button>['onPress'];
  activeStyle: CSSProperties;
  children: ReactNode;
  forceActive?: boolean;
};

export function ItemContent({
  style,
  to,
  onClick,
  activeStyle,
  forceActive,
  children,
}: ItemContentProps) {
  return onClick ? (
    <Button
      variant="bare"
      style={{
        justifyContent: 'flex-start',
        ...style,
        ...(forceActive ? activeStyle : {}),
      }}
      onPress={onClick}
    >
      {children}
    </Button>
  ) : (
    <Link variant="internal" to={to} style={style} activeStyle={activeStyle}>
      {children}
    </Link>
  );
}
