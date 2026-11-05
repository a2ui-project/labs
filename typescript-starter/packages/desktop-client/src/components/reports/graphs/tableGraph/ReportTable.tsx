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

import React, {useLayoutEffect, useRef} from 'react';
import type {RefObject, UIEventHandler} from 'react';

import {Block} from '@actual-app/components/block';
import type {CSSProperties} from '@actual-app/components/styles';
import {View} from '@actual-app/components/view';
import type {
  balanceTypeOpType,
  DataEntity,
  GroupedEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import {ReportTableHeader} from './ReportTableHeader';
import {ReportTableList} from './ReportTableList';
import {ReportTableRow} from './ReportTableRow';
import {ReportTableTotals} from './ReportTableTotals';

type ReportTableProps = {
  saveScrollWidth: (value: number) => void;
  headerScrollRef: RefObject<HTMLDivElement | null>;
  listScrollRef: RefObject<HTMLDivElement | null>;
  totalScrollRef: RefObject<HTMLDivElement | null>;
  handleScroll: UIEventHandler<HTMLDivElement>;
  groupBy: string;
  balanceTypeOp: balanceTypeOpType;
  data: DataEntity;
  filters?: RuleConditionEntity[];
  mode: string;
  intervalsCount: number;
  interval: string;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
};

export type renderTotalsProps = {
  metadata: GroupedEntity;
  mode: string;
  totalsStyle: CSSProperties;
  testStyle: CSSProperties;
  scrollWidthTotals: number;
};

export type renderRowProps = {
  item: GroupedEntity;
  mode: string;
  style?: CSSProperties;
};

export function ReportTable({
  saveScrollWidth,
  headerScrollRef,
  listScrollRef,
  totalScrollRef,
  handleScroll,
  groupBy,
  balanceTypeOp,
  data,
  filters,
  mode,
  intervalsCount,
  interval,
  compact,
  style,
  compactStyle,
  showHiddenCategories,
  showOffBudget,
}: ReportTableProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (contentRef.current && saveScrollWidth) {
      saveScrollWidth(contentRef.current ? contentRef.current.offsetWidth : 0);
    }
  });

  const renderRow = ({item, mode, style}: renderRowProps) => {
    return (
      <ReportTableRow
        item={item}
        balanceTypeOp={balanceTypeOp}
        groupBy={groupBy}
        mode={mode}
        filters={filters}
        startDate={data.startDate}
        endDate={data.endDate}
        intervalsCount={intervalsCount}
        compact={compact}
        style={style}
        compactStyle={compactStyle}
        showHiddenCategories={showHiddenCategories}
        showOffBudget={showOffBudget}
        interval={interval}
      />
    );
  };

  const renderTotals = ({
    metadata,
    mode,
    totalsStyle,
    testStyle,
    scrollWidthTotals,
  }: renderTotalsProps) => {
    return (
      <ReportTableRow
        item={metadata}
        balanceTypeOp={balanceTypeOp}
        groupBy={groupBy}
        mode={mode}
        filters={filters}
        startDate={data.startDate}
        endDate={data.endDate}
        intervalsCount={intervalsCount}
        compact={compact}
        style={totalsStyle}
        compactStyle={compactStyle}
        showHiddenCategories={showHiddenCategories}
        showOffBudget={showOffBudget}
        totalStyle={testStyle}
        totalScrollRef={totalScrollRef}
        handleScroll={handleScroll}
        height={32 + scrollWidthTotals}
        interval={interval}
        colorized
      />
    );
  };

  return (
    <View>
      <ReportTableHeader
        headerScrollRef={headerScrollRef}
        handleScroll={handleScroll}
        data={data.intervalData}
        groupBy={groupBy}
        interval={interval}
        balanceTypeOp={balanceTypeOp}
        compact={compact}
        style={style}
        compactStyle={compactStyle}
        mode={mode}
      />
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          outline: 'none',
          '& .animated .animated-row': {transition: '.25s transform'},
        }}
        tabIndex={0}
      >
        <Block
          innerRef={listScrollRef}
          onScroll={handleScroll}
          id="list"
          style={{
            overflowY: 'auto',
            scrollbarWidth: 'none',
            '::-webkit-scrollbar': {display: 'none'},
            flex: 1,
            outline: 'none',
            '& .animated .animated-row': {transition: '.25s transform'},
          }}
        >
          <ReportTableList
            data={data}
            mode={mode}
            groupBy={groupBy}
            renderRow={renderRow}
            style={style}
          />
        </Block>
      </View>
      <ReportTableTotals
        data={data}
        mode={mode}
        totalScrollRef={totalScrollRef}
        compact={compact}
        style={style}
        renderTotals={renderTotals}
      />
    </View>
  );
}
