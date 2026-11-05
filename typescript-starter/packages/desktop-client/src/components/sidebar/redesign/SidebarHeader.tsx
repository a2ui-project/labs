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

import type {ReactNode} from 'react';

import {SvgLogo} from '@actual-app/components/icons/logo';
import {theme} from '@actual-app/components/theme';
import {spacing} from '@actual-app/components/tokens';
import {View} from '@actual-app/components/view';

import {hasMacOSWindowButtons} from '#components/sidebar/SidebarShell';

import {SidebarBudgetName} from './SidebarBudgetName';
import {SyncStatusLine} from './SyncStatusLine';

const MAC_WINDOW_BUTTONS_INSET = spacing.xl + spacing.md;

type SidebarHeaderProps = {
  children?: ReactNode;
};

export function SidebarHeader({children}: SidebarHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `${spacing.md}px ${spacing.md}px ${spacing.sm}px`,
        paddingTop: hasMacOSWindowButtons() ? MAC_WINDOW_BUTTONS_INSET : spacing.md,
        borderBottom: `1px solid ${theme.sidebarBorder}`,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <SvgLogo width={28} height={28} style={{flexShrink: 0, color: theme.sidebarBrand}} />
      <View style={{minWidth: 0, flex: 1}}>
        <SidebarBudgetName />
        <SyncStatusLine />
      </View>
      {children}
    </View>
  );
}
