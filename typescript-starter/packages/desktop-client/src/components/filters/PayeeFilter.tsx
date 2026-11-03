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

import React from 'react';
import { useTranslation } from 'react-i18next';

import type { PayeeEntity } from '@actual-app/core/types/models';

import { PayeeAutocomplete } from '#components/autocomplete/PayeeAutocomplete';

type PayeeFilterValue = PayeeEntity['id'] | PayeeEntity['id'][];

/** This component only supports single- or multi-select operations. */
type PayeeFilterOp = 'is' | 'isNot' | 'oneOf' | 'notOneOf';

type PayeeFilterProps = {
  /** The selected value(s) of the filter. This is a controlled component. */
  value: PayeeFilterValue;

  /** To determine the use of a single- or multi-select input. */
  op: PayeeFilterOp;

  /** Called whenever the selected value(s) of the filter change. */
  onChange: (value: PayeeFilterValue) => void;
};

/**
 * Component to filter on payee.
 *
 * This component also shows "inactive" payees, specifically meant for transfer payees
 * whose account are closed. This lets the end-user filter transactions (among others)
 * based on transfer payees of closed accounts.
 */
export const PayeeFilter = ({ value, op, onChange }: PayeeFilterProps) => {
  const { t } = useTranslation();
  const multi = ['oneOf', 'notOneOf'].includes(op);

  let coercedValue: PayeeFilterValue;
  if (multi) {
    coercedValue = Array.isArray(value) ? value : [];
  } else {
    coercedValue = Array.isArray(value) ? (value[0] ?? null) : value;
  }

  const placeholder =
    multi && coercedValue.length > 0 ? undefined : t('nothing');

  return (
    // @ts-expect-error: typing is not playing nicely with the union type of AutocompleteProps.
    <PayeeAutocomplete
      type={multi ? 'multi' : 'single'}
      showInactivePayees
      showMakeTransfer={false}
      openOnFocus
      value={coercedValue}
      inputProps={{ placeholder }}
      onSelect={(payeeIdOrIds: string | string[], _: string) =>
        onChange(payeeIdOrIds)
      }
    />
  );
};
