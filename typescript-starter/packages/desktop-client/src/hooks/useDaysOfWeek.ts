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

import {useTranslation} from 'react-i18next';

// 0 = Sunday, 1 = Monday, ... 6 = Saturday
export function useDaysOfWeek() {
  const {t} = useTranslation();

  const daysOfWeek = {
    0: t('Sunday'),
    1: t('Monday'),
    2: t('Tuesday'),
    3: t('Wednesday'),
    4: t('Thursday'),
    5: t('Friday'),
    6: t('Saturday'),
  } satisfies Record<number, string>;

  return daysOfWeek;
}
