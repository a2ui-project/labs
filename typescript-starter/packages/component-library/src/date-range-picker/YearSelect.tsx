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

import { useContext } from 'react';
import { RangeCalendarStateContext } from 'react-aria-components';

// react-aria's CalendarYearPicker windows its year list by stepping whole
// years from minValue, which drops maxValue's year whenever the range doesn't
// span full years — for a budget that's most of the time. Build the list from
// the bounds' years instead; setFocusedDate clamps to [minValue, maxValue].
export function YearSelect({ label }: { label: string }) {
  const state = useContext(RangeCalendarStateContext);
  if (!state) return null;
  const minYear = state.minValue?.year ?? state.focusedDate.year;
  // An omitted upper bound arrives as a far-future sentinel; don't render
  // thousands of year options for it. Keep the focused year listed so the
  // select stays valid when navigating past the cap via the arrow buttons.
  const maxYear = Math.min(
    state.maxValue?.year ?? state.focusedDate.year,
    Math.max(state.focusedDate.year, new Date().getFullYear() + 10),
  );
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i,
  );
  return (
    <select
      aria-label={label}
      value={state.focusedDate.year}
      onChange={e =>
        state.setFocusedDate(
          state.focusedDate.set({ year: Number(e.target.value) }),
        )
      }
    >
      {years.map(year => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
}
