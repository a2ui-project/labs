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

import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAlertTriangle } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

export function UnsupportedDirectivesNotice({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: 32,
        gap: 16,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <SvgAlertTriangle
        width={32}
        height={32}
        style={{ color: theme.errorText }}
      />
      <Text
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: theme.pageText,
        }}
      >
        <Trans>This category isn&rsquo;t supported in the UI yet</Trans>
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: theme.pageTextLight,
          maxWidth: 480,
          lineHeight: 1.5,
        }}
      >
        <Trans>
          One or more <code>#template</code> lines in this category&rsquo;s
          notes couldn&rsquo;t be parsed. Fix them as text first, then re-open
          this modal to migrate.
        </Trans>
      </Text>
      <Button onPress={onClose}>
        <Trans>Close</Trans>
      </Button>
    </View>
  );
}
