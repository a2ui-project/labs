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

import type {ComponentType, SVGProps} from 'react';
import {useTranslation} from 'react-i18next';

import {SvgCloudCheck, SvgCloudWarning} from '@actual-app/components/icons/v1';
import {SvgCloudUnknown} from '@actual-app/components/icons/v2';
import {styles} from '@actual-app/components/styles';
import {Text} from '@actual-app/components/text';
import {theme} from '@actual-app/components/theme';
import {spacing} from '@actual-app/components/tokens';
import {View} from '@actual-app/components/view';

import {useSyncServerStatus} from '#hooks/useSyncServerStatus';
import {useSyncStatus} from '#hooks/useSyncStatus';
import type {SyncState} from '#hooks/useSyncStatus';

type SyncPresentation = {
  Icon: ComponentType<SVGProps<SVGElement>> | ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  label: string;
};

export function SyncStatusLine() {
  const {t} = useTranslation();
  const serverStatus = useSyncServerStatus();
  const {isSyncing, syncState} = useSyncStatus();

  const presentations: Record<
    'no-server' | 'syncing' | 'synced' | Exclude<SyncState, null>,
    SyncPresentation
  > = {
    'no-server': {
      Icon: SvgCloudUnknown,
      color: theme.sidebarTextSubdued,
      label: t('Local only'),
    },
    syncing: {
      Icon: SvgCloudCheck,
      color: theme.sidebarTextSubdued,
      label: t('Syncing…'),
    },
    error: {
      Icon: SvgCloudWarning,
      color: theme.sidebarTextFailed,
      label: t('Sync error'),
    },
    offline: {
      Icon: SvgCloudUnknown,
      color: theme.sidebarTextSubdued,
      label: t('Offline'),
    },
    local: {
      Icon: SvgCloudUnknown,
      color: theme.sidebarTextSubdued,
      label: t('Local file'),
    },
    disabled: {
      Icon: SvgCloudUnknown,
      color: theme.sidebarTextSubdued,
      label: t('Sync disabled'),
    },
    synced: {
      Icon: SvgCloudCheck,
      color: theme.sidebarTextPositive,
      label: t('Synced'),
    },
  };

  const statusKey =
    serverStatus === 'no-server' ? 'no-server' : isSyncing ? 'syncing' : (syncState ?? 'synced');
  const {Icon, color, label} = presentations[statusKey];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: 1,
      }}
    >
      <Icon width={10} height={10} style={{flexShrink: 0, color}} />
      <Text
        style={{
          fontSize: 11,
          color: theme.sidebarTextSubdued,
          ...styles.ellipsisText,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
