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

import { Text } from '@actual-app/components/text';

import { Error } from '#components/alerts';
import {
  GlobalConflictDetail,
  GlobalConflictTitle,
} from '#components/budget/goals/automationMessages';
import type { GlobalConflictKind } from '#components/budget/goals/validateAutomation';

type ConflictBannerProps = {
  conflict: GlobalConflictKind;
};

export function ConflictBanner({ conflict }: ConflictBannerProps) {
  return (
    <Error
      style={{
        padding: '8px 12px',
        margin: '12px 24px 0',
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      <Text>
        <strong>
          <GlobalConflictTitle conflict={conflict} />.
        </strong>{' '}
        <GlobalConflictDetail conflict={conflict} />
      </Text>
    </Error>
  );
}
