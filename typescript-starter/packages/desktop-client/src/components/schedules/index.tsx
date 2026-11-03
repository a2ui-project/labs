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

import React, { useCallback, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { q } from '@actual-app/core/shared/query';
import type { ScheduleEntity } from '@actual-app/core/types/models';

import { Search } from '#components/common/Search';
import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { Page } from '#components/Page';
import { useSchedules } from '#hooks/useSchedules';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { SchedulesTable } from './SchedulesTable';
import type { ScheduleItemAction } from './SchedulesTable';

export function Schedules() {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const [filter, setFilter] = useState('');

  const onEdit = useCallback(
    (id: ScheduleEntity['id']) => {
      dispatch(
        pushModal({ modal: { name: 'schedule-edit', options: { id } } }),
      );
    },
    [dispatch],
  );

  const onAdd = useCallback(() => {
    dispatch(pushModal({ modal: { name: 'schedule-edit', options: {} } }));
  }, [dispatch]);

  const onDiscover = useCallback(() => {
    dispatch(pushModal({ modal: { name: 'schedules-discover' } }));
  }, [dispatch]);

  const onChangeUpcomingLength = useCallback(() => {
    dispatch(pushModal({ modal: { name: 'schedules-upcoming-length' } }));
  }, [dispatch]);

  const onAction = useCallback(
    async (name: ScheduleItemAction, id: ScheduleEntity['id']) => {
      switch (name) {
        case 'post-transaction':
          await send('schedule/post-transaction', { id });
          break;
        case 'post-transaction-today':
          await send('schedule/post-transaction', { id, today: true });
          break;
        case 'skip':
          await send('schedule/skip-next-date', { id });
          break;
        case 'complete':
          await send('schedule/update', {
            schedule: { id, completed: true },
          });
          break;
        case 'restart':
          await send('schedule/update', {
            schedule: { id, completed: false },
            resetNextDate: true,
          });
          break;
        case 'delete':
          await send('schedule/delete', { id });
          break;
        default:
          throw new Error(`Unknown action: ${String(name)}`);
      }
    },
    [],
  );

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const {
    isLoading: isSchedulesLoading,
    schedules,
    statuses,
  } = useSchedules({ query: schedulesQuery });

  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <Page header={t('Schedules')}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: '0 0 15px',
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'flex-end',
            }}
          >
            <Search
              placeholder={t('Filter schedules…')}
              value={filter}
              onChange={setFilter}
            />
          </View>
        </View>

        <SchedulesTable
          isLoading={isSchedulesLoading}
          schedules={schedules}
          filter={filter}
          statuses={statuses}
          allowCompleted
          onSelect={onEdit}
          onAction={onAction}
          style={{ backgroundColor: theme.tableBackground }}
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            margin: '20px 0',
            flexShrink: 0,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: '1em',
            }}
          >
            <Button onPress={onDiscover}>
              <Trans>Find schedules</Trans>
            </Button>
            <Button onPress={onChangeUpcomingLength}>
              <Trans>Change upcoming length</Trans>
            </Button>
          </View>
          <Button variant="primary" onPress={onAdd}>
            <Trans>Add new schedule</Trans>
          </Button>
        </View>
      </Page>
    </ErrorBoundary>
  );
}
