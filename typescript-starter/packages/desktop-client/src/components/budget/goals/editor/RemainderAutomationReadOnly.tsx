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

import type { RemainderTemplate } from '@actual-app/core/types/models/templates';

type RemainderAutomationReadOnlyProps = {
  template: RemainderTemplate;
};

export const RemainderAutomationReadOnly = ({
  template,
}: RemainderAutomationReadOnlyProps) => {
  return (
    <Trans>
      Share remaining funds to budget (weight {{ weight: template.weight ?? 1 }}
      )
    </Trans>
  );
};
