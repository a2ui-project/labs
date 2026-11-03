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

import * as monthUtils from '@actual-app/core/shared/months';
import type { TimeFrame } from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import { ReportOptions } from './ReportOptions';
import { getSpecificRange, validateRange } from './reportRanges';

export function getLiveRange(
  cond: string,
  earliestTransaction: string,
  latestTransaction: string,
  includeCurrentInterval: boolean,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
): [string, string, TimeFrame['mode']] {
  let dateStart = earliestTransaction;
  let dateEnd = latestTransaction;
  const rangeName = ReportOptions.dateRangeMap.get(cond);
  switch (rangeName) {
    case 'yearToDate': {
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.getYearStart(monthUtils.currentMonth()) + '-01',
        monthUtils.currentDay(),
      );
      break;
    }
    case 'lastMonth': {
      const prevMonth = monthUtils.subMonths(monthUtils.currentMonth(), 1);
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.firstDayOfMonth(prevMonth),
        monthUtils.lastDayOfMonth(prevMonth),
      );
      break;
    }
    case 'lastYear': {
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.getYearStart(
          monthUtils.prevYear(monthUtils.currentMonth()),
        ) + '-01',
        monthUtils.getYearEnd(monthUtils.prevYear(monthUtils.currentDate())) +
          '-31',
      );
      break;
    }
    case 'priorYearToDate': {
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.getYearStart(
          monthUtils.prevYear(monthUtils.currentMonth()),
        ) + '-01',
        monthUtils.prevYear(monthUtils.currentDate(), 'yyyy-MM-dd'),
      );
      break;
    }
    case 'currentQuarter': {
      const quarterStart = monthUtils.getQuarterStart(
        monthUtils.currentMonth(),
      );
      const quarterEnd = monthUtils.getQuarterEnd(monthUtils.currentMonth());
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        quarterStart + '-01',
        monthUtils.lastDayOfMonth(quarterEnd),
      );
      break;
    }
    case 'previousQuarter': {
      const prevQuarterMonth = monthUtils.prevQuarter(
        monthUtils.currentMonth(),
      );
      const quarterStart = monthUtils.getQuarterStart(prevQuarterMonth);
      const quarterEnd = monthUtils.getQuarterEnd(prevQuarterMonth);
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        quarterStart + '-01',
        monthUtils.lastDayOfMonth(quarterEnd),
      );
      break;
    }
    case 'last30Days': {
      [dateStart, dateEnd] = validateRange(
        earliestTransaction,
        monthUtils.subDays(monthUtils.currentDay(), 29),
        monthUtils.currentDay(),
      );
      break;
    }
    case 'allTime': {
      dateStart = earliestTransaction;
      dateEnd = latestTransaction;
      break;
    }
    default:
      if (typeof rangeName === 'number') {
        [dateStart, dateEnd] = getSpecificRange(
          rangeName,
          ['This month', 'This week'].includes(cond)
            ? null
            : rangeName - (includeCurrentInterval ? 0 : 1),
          ReportOptions.dateRangeType.get(cond),
          firstDayOfWeekIdx,
        );
      } else {
        break;
      }
  }

  return [dateStart, dateEnd, 'sliding-window'];
}
