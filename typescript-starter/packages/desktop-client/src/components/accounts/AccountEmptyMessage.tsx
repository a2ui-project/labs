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
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type AccountEmptyMessageProps = {
  onAdd: () => void;
};

export function AccountEmptyMessage({ onAdd }: AccountEmptyMessageProps) {
  return (
    <View
      style={{
        color: theme.tableText,
        backgroundColor: theme.tableBackground,
        flex: 1,
        alignItems: 'center',
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      <View
        style={{
          width: 550,
          marginTop: 75,
          fontSize: 15,
          alignItems: 'center',
        }}
      >
        <Text style={{ textAlign: 'center', lineHeight: '1.4em' }}>
          <Trans>
            <strong>Let's add your first account.</strong> Accounts hold your
            transactions, like everyday spending, savings, credit cards, or
            cash. You can connect to your bank to import transactions
            automatically, or add them yourself.
          </Trans>
        </Text>

        <Button
          variant="primary"
          style={{ marginTop: 20 }}
          autoFocus
          onPress={onAdd}
        >
          <Trans>Add account</Trans>
        </Button>

        <View
          style={{ marginTop: 20, fontSize: 13, color: theme.tableTextLight }}
        >
          <Trans>You can add more accounts at any time from the sidebar.</Trans>
        </View>
      </View>
    </View>
  );
}
