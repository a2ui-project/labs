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

import {useTranslation} from 'react-i18next';

import {theme} from '@actual-app/components/theme';
import {radius} from '@actual-app/components/tokens';
import {View} from '@actual-app/components/view';

export type SyncDotStatus = 'synced' | 'error' | 'pending' | 'unlinked';

export function useSyncDotLabel(status: SyncDotStatus): string {
  const {t} = useTranslation();

  const labels: Record<SyncDotStatus, string> = {
    synced: t('Synced'),
    error: t('Sync error'),
    pending: t('Syncing'),
    unlinked: t('Not linked'),
  };

  return labels[status];
}

type SyncDotProps = {
  status: SyncDotStatus;
};

export function SyncDot({status}: SyncDotProps) {
  const label = useSyncDotLabel(status);

  return (
    <View
      aria-hidden
      title={label}
      style={{
        width: 7,
        height: 7,
        borderRadius: radius.pill,
        flexShrink: 0,
        ...(status === 'synced' && {
          backgroundColor: theme.sidebarItemBackgroundPositive,
        }),
        ...(status === 'error' && {
          backgroundColor: theme.sidebarItemBackgroundFailed,
        }),
        ...(status === 'pending' && {
          backgroundColor: theme.sidebarItemBackgroundPending,
        }),
        ...(status === 'unlinked' && {
          border: `1.25px solid ${theme.sidebarTextMuted}`,
        }),
      }}
    />
  );
}
