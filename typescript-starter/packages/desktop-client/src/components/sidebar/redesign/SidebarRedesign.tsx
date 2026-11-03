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

import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { useSidebar } from '#components/sidebar/SidebarProvider';
import { SidebarShell } from '#components/sidebar/SidebarShell';
import { ToggleButton } from '#components/sidebar/ToggleButton';
import { useGlobalPref } from '#hooks/useGlobalPref';

import { AccountsSection } from './AccountsSection';
import { PrimaryNav } from './PrimaryNav';
import { SidebarFooter } from './SidebarFooter';
import { SidebarHeader } from './SidebarHeader';

const DEFAULT_SIDEBAR_WIDTH = 270;

export function SidebarRedesign() {
  const { t } = useTranslation();
  const sidebar = useSidebar();
  const [isFloating = false, setFloatingSidebarPref] =
    useGlobalPref('floatingSidebar');

  const onFloat = () => {
    setFloatingSidebarPref(!isFloating);
  };

  return (
    <SidebarShell
      defaultWidth={DEFAULT_SIDEBAR_WIDTH}
      className="sidebar-redesign"
    >
      <View
        role="navigation"
        aria-label={t('Sidebar')}
        style={{ flex: 1, minHeight: 0 }}
      >
        <SidebarHeader>
          {!sidebar.alwaysFloats && (
            <ToggleButton isFloating={isFloating} onFloat={onFloat} />
          )}
        </SidebarHeader>

        <PrimaryNav />

        <View
          style={{
            height: 1,
            margin: `${spacing.sm}px ${spacing.md}px`,
            backgroundColor: theme.sidebarBorder,
            flexShrink: 0,
          }}
        />

        <AccountsSection />

        <SidebarFooter />
      </View>
    </SidebarShell>
  );
}
