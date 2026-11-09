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

/**
 * The two functions the travel catalog adds, evaluated in the renderer.
 *
 * Both are declared in `catalogs/a2ui-travel/catalog.json` in the v1.0 shape
 * (`@call`, a top-level `returnType`, and the default `rendererOnly` callers),
 * and both are pure: the SDK resolves their arguments
 * (bindings, nested calls) before calling them, and re-evaluates when the data
 * they read changes.
 */

import {parseCivil} from './calendar.js';

type Args = Record<string, unknown>;

const DAY = 24 * 60 * 60 * 1000;

/**
 * Nights between two calendar dates: a 12th-to-15th stay is 3.
 *
 * Zero when either date is missing or the range is inverted, so a half-filled
 * form says 0 rather than something negative. Dates are read from their digits,
 * not through `Date` parsing, which would move a day by the viewer's offset.
 */
export function calcNights(args: Args): number {
  const start = parseCivil(String(args['start'] ?? ''));
  const end = parseCivil(String(args['end'] ?? ''));
  if (!start || !end) return 0;
  const nights = Math.round(
    (Date.UTC(end.year, end.month - 1, end.day) -
      Date.UTC(start.year, start.month - 1, start.day)) /
      DAY,
  );
  return nights > 0 ? nights : 0;
}

/** Whether two values are the same, compared as text; for marking a row chosen. */
export function equals(args: Args): boolean {
  const a = args['a'];
  const b = args['b'];
  if (a === undefined || a === null || a === '' || b === undefined || b === null || b === '')
    return false;
  return String(a) === String(b);
}
