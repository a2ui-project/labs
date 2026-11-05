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

import {useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {Button} from '@actual-app/components/button';
import {SvgCheveronDown} from '@actual-app/components/icons/v1';
import {InitialFocus} from '@actual-app/components/initial-focus';
import {Input} from '@actual-app/components/input';
import {styles} from '@actual-app/components/styles';
import {Text} from '@actual-app/components/text';
import {theme} from '@actual-app/components/theme';
import {spacing} from '@actual-app/components/tokens';
import {isElectron} from '@actual-app/core/shared/environment';

import {closeBudget} from '#budgetfiles/budgetfilesSlice';
import {useContextMenu} from '#hooks/useContextMenu';
import {useMetadataPref} from '#hooks/useMetadataPref';
import {useNavigate} from '#hooks/useNavigate';
import {pushModal} from '#modals/modalsSlice';
import {useDispatch} from '#redux';

export function SidebarBudgetName() {
  const {t} = useTranslation();
  const [budgetName, setBudgetNamePref] = useMetadataPref('budgetName');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const {handleContextMenu} = useContextMenu({
    triggerRef,
    items: [
      {
        name: 'rename',
        text: t('Rename budget'),
        onClick: () => setIsEditing(true),
      },
      {
        name: 'settings',
        text: t('Settings'),
        onClick: () => void navigate('/settings'),
      },
      isElectron() && {
        name: 'loadBackup',
        text: t('Load Backup…'),
        onClick: () => dispatch(pushModal({modal: {name: 'load-backup', options: {}}})),
      },
      {
        name: 'close',
        text: t('Switch file'),
        onClick: () => void dispatch(closeBudget()),
      },
    ],
  });

  if (isEditing) {
    return (
      <InitialFocus>
        <Input
          style={{fontSize: 13, fontWeight: 600}}
          defaultValue={budgetName}
          onEnter={newBudgetName => {
            if (newBudgetName.trim() !== '') {
              setBudgetNamePref(newBudgetName);
              setIsEditing(false);
            }
          }}
          onBlur={() => setIsEditing(false)}
        />
      </InitialFocus>
    );
  }

  return (
    <Button
      ref={triggerRef}
      data-testid="budget-name"
      variant="bare"
      style={{
        color: theme.sidebarHeaderText,
        backgroundColor: 'transparent',
        fontSize: 13,
        fontWeight: 600,
        gap: spacing.xs,
        padding: 0,
        justifyContent: 'flex-start',
        maxWidth: '100%',
      }}
      onClick={handleContextMenu}
    >
      <Text style={styles.ellipsisText}>{budgetName || t('Unnamed')}</Text>
      <SvgCheveronDown
        width={11}
        height={11}
        style={{flexShrink: 0, color: theme.sidebarTextSubdued}}
      />
    </Button>
  );
}
