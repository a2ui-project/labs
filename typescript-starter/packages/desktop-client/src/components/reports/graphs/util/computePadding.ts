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
 * Calculates the left padding needed for chart axis based on formatted number length
 * @param values Array of numeric values
 * @param formatter Function to format numbers to strings
 * @returns Padding amount in pixels
 */
export function computePadding(values: number[], formatter: (value: number) => string) {
  if (values.length === 0) {
    return 0;
  }

  const maxLength = Math.max(
    ...values.map(value => {
      return formatter(Math.round(value)).length;
    }),
  );
  return Math.max(0, (maxLength - 5) * 5);
}
