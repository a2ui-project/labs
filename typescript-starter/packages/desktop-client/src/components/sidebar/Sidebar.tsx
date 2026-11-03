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
import { useTranslation } from 'react-i18next';

import { SvgAdd } from '@actual-app/components/icons/v1';
import { View } from '@actual-app/components/view';

import { useGlobalPref } from '#hooks/useGlobalPref';
import { replaceModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { Accounts } from './Accounts';
import { BudgetName } from './BudgetName';
import { PrimaryButtons } from './PrimaryButtons';
import { SecondaryButtons } from './SecondaryButtons';
import { useSidebar } from './SidebarProvider';
import { SidebarShell } from './SidebarShell';
import { ToggleButton } from './ToggleButton';

export function Sidebar() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const sidebar = useSidebar();
  const [isFloating = false, setFloatingSidebarPref] =
    useGlobalPref('floatingSidebar');

  const onFloat = () => {
    setFloatingSidebarPref(!isFloating);
  };

  const onAddAccount = () => {
    dispatch(replaceModal({ modal: { name: 'add-account', options: {} } }));
  };

  return (
    <SidebarShell>
      <BudgetName>
        {!sidebar.alwaysFloats && (
          <ToggleButton isFloating={isFloating} onFloat={onFloat} />
        )}
      </BudgetName>

      <View
        style={{
          flexGrow: 1,
          '@media screen and (max-height: 480px)': {
            overflowY: 'auto',
          },
        }}
      >
        <PrimaryButtons />

        <Accounts />

        <SecondaryButtons
          buttons={[
            {
              title: t('Add account'),
              Icon: SvgAdd,
              onClick: onAddAccount,
              dataTestId: 'sidebar-add-account',
            },
          ]}
        />
      </View>
    </SidebarShell>
  );
}
