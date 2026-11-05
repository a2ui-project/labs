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

import {Trans, useTranslation} from 'react-i18next';

import type {PercentageTemplate} from '@actual-app/core/types/models/templates';

type PercentageAutomationReadOnlyProps = {
  template: PercentageTemplate;
  categoryNameMap: Record<string, string>;
};

export const PercentageAutomationReadOnly = ({
  template,
  categoryNameMap,
}: PercentageAutomationReadOnlyProps) => {
  const {t} = useTranslation();

  if (template.category === 'all income') {
    return template.previous ? (
      <Trans>Budget {{percent: template.percent}}% of total income last month</Trans>
    ) : (
      <Trans>Budget {{percent: template.percent}}% of total income this month</Trans>
    );
  }

  if (template.category === 'available funds') {
    return template.previous ? (
      <Trans>Budget {{percent: template.percent}}% of available funds to budget last month</Trans>
    ) : (
      <Trans>Budget {{percent: template.percent}}% of available funds to budget this month</Trans>
    );
  }

  // Regular income categories
  return template.previous ? (
    <Trans>
      Budget {{percent: template.percent}}% of &lsquo;
      {{
        category: categoryNameMap[template.category] ?? t('Unknown category'),
      }}
      &rsquo; last month
    </Trans>
  ) : (
    <Trans>
      Budget {{percent: template.percent}}% of &lsquo;
      {{
        category: categoryNameMap[template.category] ?? t('Unknown category'),
      }}
      &rsquo; this month
    </Trans>
  );
};
