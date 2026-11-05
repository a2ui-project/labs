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
import React from 'react';
import type {ComponentPropsWithoutRef, CSSProperties, ReactNode} from 'react';

import {Text} from '@actual-app/components/text';

import {FinancialText} from '#components/FinancialText';
import {PrivacyFilter} from '#components/PrivacyFilter';
import {useFormat} from '#hooks/useFormat';
import type {FormatType} from '#hooks/useFormat';
import {useSheetName} from '#hooks/useSheetName';
import {useSheetValue} from '#hooks/useSheetValue';
import type {Binding, SheetFields, SheetNames, Spreadsheets} from '#spreadsheet';

type CellValueProps<SheetName extends SheetNames, FieldName extends SheetFields<SheetName>> = {
  children?: ({
    type,
    name,
    value,
  }: {
    type?: FormatType;
    name: string;
    value: Spreadsheets[SheetName][FieldName];
  }) => ReactNode;
  binding: Binding<SheetName, FieldName>;
  type?: FormatType;
};

export function CellValue<SheetName extends SheetNames, FieldName extends SheetFields<SheetName>>({
  type,
  binding,
  children,
  ...props
}: CellValueProps<SheetName, FieldName>) {
  const {fullSheetName} = useSheetName(binding);
  const sheetValue = useSheetValue(binding);

  return typeof children === 'function' ? (
    <>{children({type, name: fullSheetName, value: sheetValue})}</>
  ) : (
    <CellValueText type={type} name={fullSheetName} value={sheetValue} {...props} />
  );
}

const PRIVACY_FILTER_TYPES = ['financial', 'financial-with-sign'];

type CellValueTextProps<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
> = Omit<ComponentPropsWithoutRef<typeof Text>, 'value' | 'as'> & {
  type?: FormatType;
  name: string;
  value: Spreadsheets[SheetName][FieldName];
  style?: CSSProperties;
  formatter?: (value: Spreadsheets[SheetName][FieldName], type?: FormatType) => string;
};

export function CellValueText<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>({type, name, value, formatter, style, ...props}: CellValueTextProps<SheetName, FieldName>) {
  const format = useFormat();
  const isFinancial =
    type === 'financial' || type === 'financial-with-sign' || type === 'financial-no-decimals';
  const sharedProps = {
    style,
    'data-testid': name,
    'data-cellname': name,
    ...props,
  };

  if (isFinancial) {
    return (
      <FinancialText
        {...sharedProps}
        style={{
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        <PrivacyFilter activationFilters={[PRIVACY_FILTER_TYPES.includes(type)]}>
          {formatter ? formatter(value, type) : format(value, type)}
        </PrivacyFilter>
      </FinancialText>
    );
  }

  return (
    <Text {...sharedProps}>
      <PrivacyFilter activationFilters={[PRIVACY_FILTER_TYPES.includes(type)]}>
        {formatter ? formatter(value, type) : format(value, type)}
      </PrivacyFilter>
    </Text>
  );
}
