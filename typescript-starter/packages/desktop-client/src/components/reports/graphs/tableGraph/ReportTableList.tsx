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
import type { CSSProperties, ReactNode } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { DataEntity, GroupedEntity } from '@actual-app/core/types/models';

import { Row } from '#components/table';

import { RenderTableRow } from './RenderTableRow';
import type { renderRowProps } from './ReportTable';

type ReportTableListProps = {
  data: DataEntity;
  mode: string;
  groupBy: string;
  renderRow: (arg: renderRowProps) => ReactNode;
  style?: CSSProperties;
};

export function ReportTableList({
  data,
  mode,
  groupBy,
  renderRow,
  style,
}: ReportTableListProps) {
  const metadata: GroupedEntity[] | undefined =
    groupBy === 'Category'
      ? data.groupedData || []
      : groupBy === 'Interval'
        ? data.intervalData.map(interval => {
            return {
              id: '',
              name: '',
              date: interval.date,
              totalAssets: interval.totalAssets,
              totalDebts: interval.totalDebts,
              netAssets: interval.netAssets,
              netDebts: interval.netDebts,
              totalTotals: interval.totalTotals,
              totalBudgeted: interval.totalBudgeted,
              intervalData: [],
              categories: [],
            };
          })
        : data.data;

  return (
    <View>
      {metadata ? (
        <View>
          {metadata.map((item, index) => {
            return (
              <View key={index}>
                <RenderTableRow
                  index={index}
                  renderRow={renderRow}
                  mode={mode}
                  metadata={metadata}
                  style={{
                    ...(item.categories && {
                      color: theme.tableRowHeaderText,
                      backgroundColor: theme.tableRowHeaderBackground,
                      fontWeight: 600,
                    }),
                    ...style,
                  }}
                />
                {item.categories && (
                  <>
                    <View>
                      {item.categories.map(
                        (category: GroupedEntity, i: number) => {
                          return (
                            <RenderTableRow
                              key={category.id}
                              index={i}
                              renderRow={renderRow}
                              mode={mode}
                              metadata={metadata}
                              parent_index={index}
                              style={style}
                            />
                          );
                        },
                      )}
                    </View>
                    <Row height={20} />
                  </>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View width="flex" />
      )}
    </View>
  );
}
