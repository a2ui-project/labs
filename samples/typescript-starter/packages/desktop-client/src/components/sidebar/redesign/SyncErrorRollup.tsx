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

import {Text} from '@actual-app/components/text';
import {theme} from '@actual-app/components/theme';
import {radius, spacing} from '@actual-app/components/tokens';
import {View} from '@actual-app/components/view';

type SyncErrorRollupProps = {
  count: number;
};

export function SyncErrorRollup({count}: SyncErrorRollupProps) {
  const {t} = useTranslation();

  if (count === 0) {
    return null;
  }

  return (
    <View
      title={
        count === 1
          ? t('1 account needs attention')
          : t('{{count}} accounts need attention', {count})
      }
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingInline: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: theme.sidebarBackgroundFailedSubtle,
        flexShrink: 0,
      }}
    >
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: radius.pill,
          backgroundColor: theme.sidebarItemBackgroundFailed,
        }}
      />
      <Text
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: theme.sidebarTextFailed,
        }}
      >
        {count}
      </Text>
    </View>
  );
}
