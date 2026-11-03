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

import type { CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { Warning } from '#components/alerts';
import { useNotes } from '#hooks/useNotes';

export function BudgetAutomationMigrationWarning({
  categoryId,
  style,
}: {
  categoryId: string;
  style?: CSSProperties;
}) {
  const notes = useNotes(categoryId);

  if (!notes) return null;
  const templates = notes
    .split('\n')
    .filter(line => /^\s*#(template|goal|cleanup)\b/.test(line))
    .join('\n');

  if (!templates) return null;

  return (
    <Warning
      style={{
        padding: '8px 12px',
        fontSize: 12,
        ...style,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text>
          <Trans>
            Imported from notes-based templates. Review and Save to complete the
            migration.
          </Trans>
        </Text>
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 11, opacity: 0.85 }}>
            <Trans>Show original templates</Trans>
          </summary>
          <View
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: 11,
              marginTop: 6,
              padding: 8,
              borderRadius: 4,
              // Translucent overlay rather than a theme token so the inset
              // effect works regardless of the surrounding Warning colour
              // (which differs between light/dark/midnight themes).
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              maxHeight: 120,
              overflowY: 'auto',
            }}
          >
            {templates}
          </View>
        </details>
      </View>
    </Warning>
  );
}
