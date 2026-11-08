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

import {useMemo} from 'react';

import {View} from '#View';

import {GridButton} from './GridButton';
import {currentMonth, formatDate, monthFromIndex, rangePosition} from './util';

type MonthGridProps = {
  year: string;
  rangeStart: string;
  rangeEnd: string;
  minMonth: string;
  maxMonth: string;
  /** BCP 47 language tag driving the month labels. */
  locale: string;
  onSelect: (month: string) => void;
  /** Called on pointer-enter of a cell to preview the range band. */
  onHover?: (month: string) => void;
};

export function MonthGrid({
  year,
  rangeStart,
  rangeEnd,
  minMonth,
  maxMonth,
  locale,
  onSelect,
  onHover,
}: MonthGridProps) {
  const thisMonth = currentMonth();
  // Manual memo: React Compiler doesn't cover this package, and this body
  // re-renders on every hover while a range is being picked.
  const months = useMemo(
    () =>
      Array.from({length: 12}, (_, i) => {
        const month = monthFromIndex(year, i);
        return {
          month,
          label: formatDate(month, locale, {month: 'short'}),
          fullLabel: formatDate(month, locale, {
            month: 'long',
            year: 'numeric',
          }),
        };
      }),
    [year, locale],
  );
  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 4,
      }}
    >
      {months.map(({month, label, fullLabel}) => (
        <GridButton
          key={month}
          selected={month === rangeStart || month === rangeEnd}
          disabled={month < minMonth || month > maxMonth}
          isToday={month === thisMonth}
          position={rangePosition(month, rangeStart, rangeEnd)}
          label={fullLabel}
          onSelect={() => onSelect(month)}
          onHover={onHover ? () => onHover(month) : undefined}
        >
          {label}
        </GridButton>
      ))}
    </View>
  );
}
