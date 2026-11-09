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

import React from 'react';
import type {CSSProperties, RefObject, UIEventHandler} from 'react';
import {useTranslation} from 'react-i18next';

import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';
import type {balanceTypeOpType, IntervalEntity} from '@actual-app/core/types/models';

import {ReportOptions} from '#components/reports/ReportOptions';
import {Cell, Row} from '#components/table';

type ReportTableHeaderProps = {
  groupBy: string;
  interval: string;
  data: IntervalEntity[];
  balanceTypeOp: balanceTypeOpType;
  headerScrollRef: RefObject<HTMLDivElement | null>;
  handleScroll: UIEventHandler<HTMLDivElement>;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
  mode: string;
};

export function ReportTableHeader({
  groupBy,
  interval,
  data,
  balanceTypeOp,
  headerScrollRef,
  handleScroll,
  compact,
  style,
  compactStyle,
  mode,
}: ReportTableHeaderProps) {
  const {t} = useTranslation();
  return (
    <Row
      collapsed
      style={{
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
        color: theme.tableHeaderText,
        backgroundColor: theme.tableHeaderBackground,
        fontWeight: 600,
        ...style,
      }}
    >
      <View
        innerRef={headerScrollRef}
        onScroll={handleScroll}
        id="header"
        style={{
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '::-webkit-scrollbar': {display: 'none'},
          flexDirection: 'row',
          flex: 1,
        }}
      >
        <Cell
          style={{
            width: compact ? 80 : 125,
            flexShrink: 0,
            flexGrow: 1,
          }}
          valueStyle={compactStyle}
          value={groupBy === 'Interval' ? ReportOptions.intervalMap.get(interval) : groupBy}
        />
        {mode === 'time'
          ? data.map((header, index) => {
              return (
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={compactStyle}
                  key={index}
                  value={header.date}
                  textAlign="right"
                  width="flex"
                />
              );
            })
          : ['totalTotals', 'totalBudgeted'].includes(balanceTypeOp) && (
              <>
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={compactStyle}
                  value={t('Deposits')}
                  textAlign="right"
                  width="flex"
                />
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  valueStyle={compactStyle}
                  value={t('Payments')}
                  textAlign="right"
                  width="flex"
                />
              </>
            )}
        <Cell
          style={{
            minWidth: compact ? 50 : 85,
          }}
          valueStyle={compactStyle}
          value={t('Totals')}
          textAlign="right"
          width="flex"
        />
        <Cell
          style={{
            minWidth: compact ? 50 : 85,
          }}
          valueStyle={compactStyle}
          value={t('Average')}
          textAlign="right"
          width="flex"
        />
      </View>
    </Row>
  );
}
