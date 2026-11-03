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

import React, { useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { SheetNameProvider } from '#hooks/useSheetName';

import { MonthsContext } from './MonthsContext';

type RenderMonthsProps = {
  children: ReactNode | (({ month }: { month: string }) => ReactNode);
  style?: CSSProperties;
};

export function RenderMonths({ children, style }: RenderMonthsProps) {
  const { months } = useContext(MonthsContext);

  return months.map((month, index) => (
    <SheetNameProvider key={index} name={monthUtils.sheetForMonth(month)}>
      <View
        style={{
          flex: 1,
          borderLeft: '1px solid ' + theme.tableBorder,
          ...style,
        }}
      >
        {typeof children === 'function' ? children({ month }) : children}
      </View>
    </SheetNameProvider>
  ));
}
