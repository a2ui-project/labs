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

import {useRef, useState} from 'react';

import {Button} from '#Button';
import {Popover} from '#Popover';
import type {CSSProperties} from '#styles';
import {View} from '#View';

import {MonthGrid} from './date-range-picker/MonthGrid';
import {NavRow} from './date-range-picker/NavRow';
import {currentMonth, formatDate, getMonth, getYear} from './date-range-picker/util';

export type MonthPickerLabels = {
  previous: string;
  next: string;
};

type MonthPickerProps = {
  value: string;
  minDate?: string;
  maxDate?: string;
  locale: string;
  placeholder?: string;
  labels: MonthPickerLabels;
  id?: string;
  style?: CSSProperties;
  onChange: (month: string) => void;
};

// Far-past/far-future sentinels: sort before/after any real month string.
const NO_MIN = '0001-01';
const NO_MAX = '9999-12';

export function MonthPicker({
  value,
  minDate,
  maxDate,
  locale,
  placeholder,
  labels,
  id,
  style,
  onChange,
}: MonthPickerProps) {
  const month = value ? getMonth(value) : '';
  const min = minDate ? getMonth(minDate) : NO_MIN;
  const max = maxDate ? getMonth(maxDate) : NO_MAX;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => getYear(month || currentMonth()));

  function openPopover() {
    setViewYear(getYear(month || currentMonth()));
    setIsOpen(true);
  }

  const label = month
    ? formatDate(month, locale, {month: 'short', year: 'numeric'})
    : (placeholder ?? '');

  return (
    <View>
      <Button
        id={id}
        ref={triggerRef}
        data-testid="month-picker-trigger"
        onPress={() => (isOpen ? setIsOpen(false) : openPopover())}
        style={{justifyContent: 'flex-start', ...style}}
      >
        {label}
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <View style={{padding: 15, minWidth: 180}}>
          <NavRow
            label={viewYear}
            previousLabel={labels.previous}
            nextLabel={labels.next}
            canPrev={viewYear > getYear(min)}
            canNext={viewYear < getYear(max)}
            onPrev={() => setViewYear(String(Number(viewYear) - 1))}
            onNext={() => setViewYear(String(Number(viewYear) + 1))}
          />
          <MonthGrid
            year={viewYear}
            rangeStart={month}
            rangeEnd={month}
            minMonth={min}
            maxMonth={max}
            locale={locale}
            onSelect={next => {
              setIsOpen(false);
              if (next !== month) {
                onChange(next);
              }
            }}
          />
        </View>
      </Popover>
    </View>
  );
}
