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

import { Trans, useTranslation } from 'react-i18next';

import type { CleanupConfig } from '#components/budget/goals/cleanupModel';
import type { CleanupGroup } from '#hooks/useCleanupGroups';

type CleanupAutomationReadOnlyProps = {
  config: CleanupConfig;
  groups: CleanupGroup[];
};

export function CleanupAutomationReadOnly({
  config,
  groups,
}: CleanupAutomationReadOnlyProps) {
  const { t } = useTranslation();
  const isGlobal = config.global.send || config.global.take;
  const groupNames: string[] = [];
  for (const group of config.groups) {
    if (!group.send && !group.take) continue;
    const name =
      groups.find(g => g.id === group.groupId)?.name ?? t('Unknown pool');
    groupNames.push(name);
  }

  const total = (isGlobal ? 1 : 0) + groupNames.length;
  if (total === 0) return <Trans>No cleanup configured</Trans>;
  if (total > 1) {
    const count = total;
    return <Trans count={count}>Active in {{ count }} scopes</Trans>;
  }
  if (isGlobal) return <Trans>Active globally</Trans>;
  const scope = groupNames[0];
  return <Trans>Active in {{ scope }}</Trans>;
}
