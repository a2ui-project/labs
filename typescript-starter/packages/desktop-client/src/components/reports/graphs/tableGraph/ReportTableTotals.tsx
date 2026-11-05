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

import React, {useLayoutEffect, useState} from 'react';
import type {CSSProperties, ReactNode, RefObject} from 'react';
import {useTranslation} from 'react-i18next';

import {styles} from '@actual-app/components/styles';
import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';
import type {DataEntity, GroupedEntity} from '@actual-app/core/types/models';

import type {renderTotalsProps} from './ReportTable';

type RenderTotalsRowProps = {
  metadata: GroupedEntity;
  mode: string;
  totalsStyle: CSSProperties;
  testStyle: CSSProperties;
  scrollWidthTotals: number;
  renderTotals: (arg: renderTotalsProps) => ReactNode;
};
function RenderTotalsRow({
  metadata,
  mode,
  totalsStyle,
  testStyle,
  scrollWidthTotals,
  renderTotals,
}: RenderTotalsRowProps) {
  return (
    <View>
      {renderTotals({
        metadata,
        mode,
        totalsStyle,
        testStyle,
        scrollWidthTotals,
      })}
    </View>
  );
}

type ReportTableTotalsProps = {
  data: DataEntity;
  mode: string;
  totalScrollRef: RefObject<HTMLDivElement | null>;
  compact: boolean;
  style?: CSSProperties;
  renderTotals: (arg: renderTotalsProps) => ReactNode;
};

export function ReportTableTotals({
  data,
  mode,
  totalScrollRef,
  compact,
  style,
  renderTotals,
}: ReportTableTotalsProps) {
  const {t} = useTranslation();
  const [scrollWidthTotals, setScrollWidthTotals] = useState(0);

  useLayoutEffect(() => {
    if (totalScrollRef.current) {
      const [parent, child] = [
        totalScrollRef.current.offsetParent
          ? (totalScrollRef.current.parentElement
              ? totalScrollRef.current.parentElement.scrollHeight
              : 0) || 0
          : 0,
        totalScrollRef.current ? totalScrollRef.current.scrollHeight : 0,
      ];
      setScrollWidthTotals(parent > 0 && child > 0 ? parent - child : 0);
    }
  }, [totalScrollRef]);

  const metadata: GroupedEntity = {
    id: '',
    name: t('Totals'),
    intervalData: data.intervalData,
    totalAssets: data.totalAssets,
    totalDebts: data.totalDebts,
    netAssets: data.netAssets,
    netDebts: data.netDebts,
    totalTotals: data.totalTotals,
    totalBudgeted: data.totalBudgeted,
  };

  const totalsStyle: CSSProperties = {
    borderTopWidth: 1,
    borderColor: theme.tableBorder,
    justifyContent: 'center',
    color: theme.tableRowHeaderText,
    backgroundColor: theme.tableRowHeaderBackground,
    fontWeight: 600,
    ...style,
  };

  const testStyle: CSSProperties = {
    overflowX: 'auto',
    scrollbarWidth: compact ? 'none' : 'inherit',
    ...styles.horizontalScrollbar,
    '::-webkit-scrollbar': {
      backgroundColor: theme.tableBackground,
      height: 12,
      dispaly: compact && 'none',
    },
    flexDirection: 'row',
    flex: 1,
  };

  return (
    <RenderTotalsRow
      metadata={metadata}
      mode={mode}
      totalsStyle={totalsStyle}
      testStyle={testStyle}
      scrollWidthTotals={scrollWidthTotals}
      renderTotals={renderTotals}
    />
  );
}
