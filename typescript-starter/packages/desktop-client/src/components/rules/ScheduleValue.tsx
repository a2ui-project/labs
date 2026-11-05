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

import React, {useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {AnimatedLoading} from '@actual-app/components/icons/AnimatedLoading';
import {View} from '@actual-app/components/view';
import {q} from '@actual-app/core/shared/query';
import type {ScheduleEntity} from '@actual-app/core/types/models';

import {usePayeesById} from '#hooks/usePayees';
import {useSchedules} from '#hooks/useSchedules';
import {describeSchedule} from '#util/schedule';

import {Value} from './Value';

type ScheduleValueProps = {
  value: ScheduleEntity['id'];
};

export function ScheduleValue({value}: ScheduleValueProps) {
  const {t} = useTranslation();
  const {data: byId = {}} = usePayeesById();
  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const {schedules = [], isLoading} = useSchedules({query: schedulesQuery});

  if (isLoading) {
    return (
      <View aria-label={t('Loading...')} style={{display: 'inline-flex'}}>
        <AnimatedLoading width={10} height={10} />
      </View>
    );
  }

  const schedule = schedules.find(item => item.id === value);
  const display = schedule ? describeSchedule(schedule, byId[schedule._payee]) : t('(deleted)');

  return <Value value={display} field="notes" valueIsRaw />;
}
