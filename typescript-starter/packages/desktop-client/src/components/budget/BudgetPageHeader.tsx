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
import React, {memo} from 'react';
import type {ComponentProps} from 'react';

import {View} from '@actual-app/components/view';

import {useGlobalPref} from '#hooks/useGlobalPref';

import {MonthPicker} from './MonthPicker';
import {getScrollbarWidth} from './util';

type BudgetPageHeaderProps = {
  startMonth: string;
  onMonthSelect: (month: string) => void;
  numMonths: number;
  monthBounds: ComponentProps<typeof MonthPicker>['monthBounds'];
};

export const BudgetPageHeader = memo<BudgetPageHeaderProps>(
  ({startMonth, onMonthSelect, numMonths, monthBounds}) => {
    const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
    const categoryExpandedState = categoryExpandedStatePref ?? 0;
    const offsetMultipleMonths = numMonths === 1 ? 4 : 0;

    return (
      <View
        style={{
          marginLeft: 200 + 100 * categoryExpandedState + 5 - offsetMultipleMonths,
          flexShrink: 0,
        }}
      >
        <View
          style={{
            marginRight: 5 + getScrollbarWidth() - offsetMultipleMonths,
          }}
        >
          <MonthPicker
            startMonth={startMonth}
            numDisplayed={numMonths}
            monthBounds={monthBounds}
            style={{paddingTop: 5}}
            onSelect={month => onMonthSelect(month)}
          />
        </View>
      </View>
    );
  },
);

BudgetPageHeader.displayName = 'BudgetPageHeader';
