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

import {styles} from '@actual-app/components/styles';
import {Text} from '@actual-app/components/text';
import {theme} from '@actual-app/components/theme';
import {radius, spacing} from '@actual-app/components/tokens';
import {View} from '@actual-app/components/view';

import {Link} from '#components/common/Link';

type NavRowProps = {
  title: string;
  Icon: ComponentType<SVGProps<SVGElement>> | ComponentType<SVGProps<SVGSVGElement>>;
  to: string;
};

export function NavRow({title, Icon, to}: NavRowProps) {
  return (
    <View style={{flexShrink: 0}}>
      <Link
        variant="internal"
        to={to}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.sm,
          borderRadius: radius.sm,
          marginBottom: 1,
          fontSize: 13,
          fontWeight: 500,
          textDecoration: 'none',
          color: theme.sidebarItemText,
          ':hover': {backgroundColor: theme.sidebarItemBackgroundHover},
        }}
        activeStyle={{
          backgroundColor: theme.sidebarItemBackgroundSelected,
          color: theme.sidebarItemTextSelected,
          fontWeight: 600,
        }}
      >
        <Icon width={15} height={15} style={{flexShrink: 0}} />
        <Text style={styles.ellipsisText}>{title}</Text>
      </Link>
    </View>
  );
}
