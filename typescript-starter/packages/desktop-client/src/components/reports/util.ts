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

// @ts-strict-ignore
import type { Query } from '@actual-app/core/shared/query';
import type {
  AccountEntity,
  CategoryEntity,
  PayeeEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import { aqlQuery } from '#queries/aqlQuery';

export function fromDateRepr(date: string): string {
  return date.slice(0, 7);
}

export async function runAll(
  queries: Query[],
  cb: (data) => void,
): Promise<void> {
  const data = await Promise.all(
    queries.map(q => {
      return aqlQuery(q).then(({ data }) => data);
    }),
  );
  cb(data);
}

export function indexCashFlow<
  T extends { date: string; isTransfer: boolean; amount: number },
>(data: T[]): Record<string, Record<'true' | 'false', number>> {
  const results: Record<string, Record<'true' | 'false', number>> = {};
  data.forEach(item => {
    const findExisting = results?.[item.date]?.[String(item.isTransfer)] ?? 0;
    const result = { [String(item.isTransfer)]: item.amount + findExisting };
    results[item.date] = { ...results[item.date], ...result };
  });
  return results;
}

/**
 * Checks if the given conditions have issues
 * (i.e. non-existing category/payee/account being used).
 */

export function calculateHasWarning(
  conditions: RuleConditionEntity[],
  {
    categories,
    accounts,
    payees,
  }: {
    categories: CategoryEntity[];
    accounts: AccountEntity[];
    payees: PayeeEntity[];
  },
) {
  const categoryIds = new Set(categories.map(({ id }) => id));
  const payeeIds = new Set(payees.map(({ id }) => id));
  const accountIds = new Set(accounts.map(({ id }) => id));

  if (!conditions) {
    return false;
  }

  for (const cond of conditions) {
    const { field, value, op } = cond;
    const isMultiCondition = Array.isArray(value);
    const isSupportedSingleCondition = ['is', 'isNot'].includes(op);

    // Regex and other more complicated operations are not supported
    if (!isSupportedSingleCondition && !isMultiCondition) {
      continue;
    }

    // Empty value.. we can skip
    if (!isMultiCondition && !value) {
      continue;
    }

    switch (field) {
      case 'account':
        if (isMultiCondition) {
          if (value.find(val => !accountIds.has(val))) {
            return true;
          }
          break;
        }

        if (!accountIds.has(value)) {
          return true;
        }
        break;
      case 'payee':
        if (isMultiCondition) {
          if (value.find(val => !payeeIds.has(val))) {
            return true;
          }
          break;
        }

        if (!payeeIds.has(value)) {
          return true;
        }
        break;
      case 'category':
        if (isMultiCondition) {
          if (value.find(val => !categoryIds.has(val))) {
            return true;
          }
          break;
        }

        if (!categoryIds.has(value)) {
          return true;
        }
        break;
      default:
        break;
    }
  }
  return false;
}
