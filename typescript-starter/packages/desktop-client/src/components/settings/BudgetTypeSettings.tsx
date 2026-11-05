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

import React, {useState} from 'react';
import {Trans} from 'react-i18next';

import {ButtonWithLoading} from '@actual-app/components/button';
import {Text} from '@actual-app/components/text';
import {send} from '@actual-app/core/platform/client/connection';

import {Link} from '#components/common/Link';
import {useSyncedPref} from '#hooks/useSyncedPref';

import {Setting} from './UI';

export function BudgetTypeSettings() {
  const [budgetType = 'envelope', setBudgetType] = useSyncedPref('budgetType');
  const [isLoading, setIsLoading] = useState(false);

  async function onSwitchType() {
    setIsLoading(true);
    try {
      const newBudgetType = budgetType === 'envelope' ? 'tracking' : 'envelope';
      setBudgetType(newBudgetType);

      // Reset the budget cache to ensure the server-side budget system is recalculated
      await send('reset-budget-cache');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Setting
      primaryAction={
        <ButtonWithLoading onPress={onSwitchType} isLoading={isLoading}>
          {budgetType === 'tracking' ? (
            <Trans>Switch to envelope budgeting</Trans>
          ) : (
            <Trans>Switch to tracking budgeting</Trans>
          )}
        </ButtonWithLoading>
      }
    >
      <Text>
        <Trans>
          <strong>Envelope budgeting</strong> (recommended) digitally mimics physical envelope
          budgeting system by allocating funds into virtual envelopes for different expenses. It
          helps track spending and ensure you don't overspend in any category.
        </Trans>{' '}
        <Link
          variant="external"
          to="https://actualbudget.org/docs/getting-started/envelope-budgeting"
          linkColor="purple"
        >
          <Trans>Learn more</Trans>
        </Link>
      </Text>
      <Text>
        <Trans>
          With <strong>tracking budgeting</strong>, category balances reset each month, and funds
          are managed using a "Saved" metric instead of "To Be Budgeted." Income is forecasted to
          plan future spending, rather than relying on current available funds.
        </Trans>{' '}
        <Link
          variant="external"
          to="https://actualbudget.org/docs/getting-started/tracking-budget"
          linkColor="purple"
        >
          <Trans>Learn more</Trans>
        </Link>
      </Text>
    </Setting>
  );
}
