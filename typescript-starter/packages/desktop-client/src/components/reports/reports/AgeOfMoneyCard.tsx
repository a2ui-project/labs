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

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Trans, useTranslation} from 'react-i18next';

import {Block} from '@actual-app/components/block';
import {useResponsive} from '@actual-app/components/hooks/useResponsive';
import {styles} from '@actual-app/components/styles';
import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';
import {send} from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type {AgeOfMoneyWidget} from '@actual-app/core/types/models';

import {PrivacyFilter} from '#components/PrivacyFilter';
import {DateRange} from '#components/reports/DateRange';
import {AgeOfMoneyGraph} from '#components/reports/graphs/AgeOfMoneyGraph';
import {LoadingIndicator} from '#components/reports/LoadingIndicator';
import {ReportCard} from '#components/reports/ReportCard';
import {ReportCardName} from '#components/reports/ReportCardName';
import {calculateTimeRange} from '#components/reports/reportRanges';
import {createAgeOfMoneySpreadsheet} from '#components/reports/spreadsheets/age-of-money-spreadsheet';
import {useReport} from '#components/reports/useReport';

// Determine status color based on age
export function getAgeColor(age: number | null) {
  if (age === null) return theme.reportsNumberNeutral;
  if (age >= 30) return theme.reportsNumberPositive; // Green - good
  if (age >= 14) return theme.warningText; // Yellow - getting there
  return theme.reportsNumberNegative; // Red - needs work
}

// Trend indicator
function getTrendIndicator(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    default:
      return '→';
  }
}

type AgeOfMoneyCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: AgeOfMoneyWidget['meta'];
  onMetaChange: (newMeta: AgeOfMoneyWidget['meta']) => void;
};

export function AgeOfMoneyCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
}: AgeOfMoneyCardProps) {
  const {t} = useTranslation();
  const {isNarrowWidth} = useResponsive();

  const [latestTransaction, setLatestTransaction] = useState<string>('');
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);

  useEffect(() => {
    async function fetchLatestTransaction() {
      const latestTrans = await send('get-latest-transaction');
      setLatestTransaction(latestTrans ? latestTrans.date : monthUtils.currentDay());
    }
    void fetchLatestTransaction();
  }, []);

  const [start, end] = calculateTimeRange(meta?.timeFrame, undefined, latestTransaction);

  const onCardHover = useCallback(() => setIsCardHovered(true), []);
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false), []);

  const params = useMemo(
    () =>
      createAgeOfMoneySpreadsheet({
        start,
        end,
        conditions: meta?.conditions,
        conditionsOp: meta?.conditionsOp,
        granularity: meta?.granularity ?? 'monthly',
      }),
    [start, end, meta?.conditions, meta?.conditionsOp, meta?.granularity],
  );
  const data = useReport('age_of_money', params);

  return (
    <ReportCard
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/age-of-money/${widgetId}`}
      onRename={() => setNameMenuOpen(true)}
    >
      <View style={{flex: 1}} onPointerEnter={onCardHover} onPointerLeave={onCardHoverEnd}>
        <View style={{flexDirection: 'row', padding: 20}}>
          <View style={{flex: 1}}>
            <ReportCardName
              name={meta?.name || t('Age of Money')}
              isEditing={nameMenuOpen}
              onChange={newName => {
                onMetaChange({
                  ...meta,
                  name: newName,
                });
                setNameMenuOpen(false);
              }}
              onClose={() => setNameMenuOpen(false)}
            />
            <DateRange start={start} end={end} />
          </View>
          {data && (
            <View style={{textAlign: 'right'}}>
              <Block
                style={{
                  ...styles.largeText,
                  fontWeight: 500,
                  marginBottom: 5,
                  color: getAgeColor(data.currentAge),
                }}
              >
                <PrivacyFilter activationFilters={[!isCardHovered]}>
                  {data.currentAge !== null
                    ? t('{{days}} days', {days: data.currentAge})
                    : t('N/A')}
                </PrivacyFilter>
              </Block>
              {data.currentAge !== null && (
                <Block
                  style={{
                    fontSize: 12,
                    color: theme.pageTextSubdued,
                  }}
                >
                  {getTrendIndicator(data.trend)}{' '}
                  {data.trend === 'up'
                    ? t('Improving')
                    : data.trend === 'down'
                      ? t('Declining')
                      : t('Stable')}
                </Block>
              )}
              {data.insufficientData && (
                <Block
                  style={{
                    fontSize: 10,
                    color: theme.warningText,
                    marginTop: 2,
                  }}
                >
                  <Trans>Incomplete data</Trans>
                </Block>
              )}
            </View>
          )}
        </View>

        {data ? (
          <AgeOfMoneyGraph
            data={data.graphData}
            compact
            showTooltip={!isEditing && !isNarrowWidth}
            style={{height: 'auto', flex: 1}}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
