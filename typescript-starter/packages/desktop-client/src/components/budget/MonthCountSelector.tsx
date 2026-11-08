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
import {useTranslation} from 'react-i18next';

import {SvgCalendar} from '@actual-app/components/icons/v2';
import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';

import {useBudgetMonthCount} from './BudgetMonthCountContext';

type CalendarProps = {
  color: string;
  onClick: () => void;
};

function Calendar({color, onClick}: CalendarProps) {
  return <SvgCalendar style={{width: 13, height: 13, color, marginRight: 5}} onClick={onClick} />;
}

type MonthCountSelectorProps = {
  maxMonths: number;
  onChange: (value: number) => void;
};

export function MonthCountSelector({maxMonths, onChange}: MonthCountSelectorProps) {
  const {t} = useTranslation();

  const {displayMax} = useBudgetMonthCount();

  // It doesn't make sense to show anything if we can only fit one
  // month
  if (displayMax <= 1) {
    return null;
  }

  const calendars = [];
  for (let i = 1; i <= displayMax; i++) {
    calendars.push(
      <Calendar
        key={i}
        color={maxMonths >= i ? theme.pageTextLight : theme.pageTextSubdued}
        onClick={() => onChange(i)}
      />,
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        marginRight: 20,
        marginTop: -1,
        WebkitAppRegion: 'no-drag',
        '& svg': {
          transition: 'transform .15s',
        },
        '& svg:hover': {
          transform: 'scale(1.2)',
        },
      }}
      title={t('Choose the number of months shown at a time')}
    >
      {calendars}
    </View>
  );
}
