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

import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
} from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { AutoTextSize } from 'auto-text-size';

import { makeAmountGrey } from '#components/budget/util';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CellValue } from '#components/spreadsheet/CellValue';
import { useCategoryScheduleGoalTemplateIndicator } from '#hooks/useCategoryScheduleGoalTemplateIndicator';
import { useFormat } from '#hooks/useFormat';
import type { Binding } from '#spreadsheet';

import { getColumnWidth, PILL_STYLE } from './BudgetTable';

type SpentCellProps = {
  binding: Binding<'envelope-budget' | 'tracking-budget', 'sum-amount'>;
  category: CategoryEntity;
  month: string;
  show3Columns?: boolean;
  onPress?: () => void;
};

export function SpentCell({
  binding,
  category,
  month,
  show3Columns,
  onPress,
}: SpentCellProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const columnWidth = getColumnWidth({
    show3Columns,
  });

  const { schedule, scheduleStatus, isScheduleRecurring } =
    useCategoryScheduleGoalTemplateIndicator({
      category,
      month,
    });

  return (
    <CellValue<'envelope-budget' | 'tracking-budget', 'sum-amount'>
      binding={binding}
      type="financial"
      aria-label={t('Spent amount for {{categoryName}} category', {
        categoryName: category.name,
      })}
    >
      {({ type, value }) => (
        <>
          <Button
            variant="bare"
            style={{
              ...PILL_STYLE,
            }}
            onPress={onPress}
            aria-label={t('Show transactions for {{categoryName}} category', {
              categoryName: category.name,
            })}
          >
            <PrivacyFilter>
              <AutoTextSize
                key={value}
                as={Text}
                minFontSizePx={6}
                maxFontSizePx={12}
                mode="oneline"
                style={{
                  ...styles.tnum,
                  ...makeAmountGrey(value),
                  maxWidth: columnWidth,
                  textAlign: 'right',
                  fontSize: 12,
                }}
              >
                {format(value, type)}
              </AutoTextSize>
            </PrivacyFilter>
          </Button>
          {schedule && scheduleStatus && (
            <View
              style={{
                position: 'absolute',
                right: '-3px',
                top: '-5px',
                borderRadius: '50%',
                color:
                  scheduleStatus === 'missed'
                    ? theme.errorText
                    : scheduleStatus === 'due'
                      ? theme.warningText
                      : theme.upcomingText,
              }}
            >
              {isScheduleRecurring ? (
                <SvgArrowsSynchronize width={11} height={11} />
              ) : (
                <SvgCalendar3 width={10} height={10} />
              )}
            </View>
          )}
        </>
      )}
    </CellValue>
  );
}
