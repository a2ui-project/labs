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

// Format a YYYY-MM string as "MMM yyyy" using the active locale (matching
// the convention used elsewhere in the codebase via monthUtils.format).
// Falls back to the raw input if it doesn't look like YYYY-MM, and to "—"
// for empty/missing values so callers don't need their own guards.
export function formatMonthLabel(
  month: string | undefined | null,
  locale?: Parameters<typeof monthUtils.format>[2],
): string {
  if (!month) return '—';
  if (!monthUtils.isValidYearMonth(month)) return month;
  return monthUtils.format(`${month}-01`, 'MMM yyyy', locale);
}
