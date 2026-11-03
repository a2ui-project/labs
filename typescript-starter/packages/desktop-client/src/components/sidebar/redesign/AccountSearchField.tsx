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

import { Button } from '@actual-app/components/button';
import { SvgRemove } from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

type AccountSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
};

export function AccountSearchField({
  value,
  onChange,
  onClose,
}: AccountSearchFieldProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.xs,
      }}
    >
      <InitialFocus>
        <Input
          value={value}
          aria-label={t('Find account')}
          placeholder={t('Find account')}
          onChangeValue={onChange}
          onEscape={onClose}
          style={{
            flex: 1,
            fontSize: 12,
            backgroundColor: theme.sidebarControlBackground,
            border: '1px solid transparent',
            color: theme.sidebarItemText,
          }}
        />
      </InitialFocus>
      <Button
        variant="bare"
        aria-label={t('Close search')}
        onPress={onClose}
        style={{ color: theme.sidebarTextSubdued, padding: spacing.xxs }}
      >
        <SvgRemove width={9} height={9} />
      </Button>
    </View>
  );
}
