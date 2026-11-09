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

import {useLayoutEffect, useState} from 'react';

import {accountBalance} from '#spreadsheet/bindings';

import {useSpreadsheet} from './useSpreadsheet';

/**
 * Live balances for a set of accounts, keyed by account id. Values are
 * null until the spreadsheet reports them. Unlike useSheetValue this
 * accepts a variable-length list, binding one account-balance query per id.
 */
export function useAccountBalances(accountIds: string[]): Record<string, number | null> {
  const spreadsheet = useSpreadsheet();
  const [balances, setBalances] = useState<Record<string, number | null>>({});

  // Re-bind only when the set of accounts actually changes
  const bindingKey = [...new Set(accountIds)].sort().join(',');

  useLayoutEffect(() => {
    if (bindingKey === '') {
      setBalances({});
      return;
    }

    let isMounted = true;
    const unbinds = bindingKey.split(',').map(accountId =>
      spreadsheet.bind('__global', accountBalance(accountId), result => {
        if (!isMounted) {
          return;
        }
        const value = typeof result.value === 'number' ? result.value : null;
        setBalances(previous =>
          previous[accountId] === value ? previous : {...previous, [accountId]: value},
        );
      }),
    );

    return () => {
      isMounted = false;
      for (const unbind of unbinds) {
        unbind();
      }
    };
  }, [spreadsheet, bindingKey]);

  return balances;
}
