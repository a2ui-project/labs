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
import type {CSSProperties} from 'react';
import {Trans, useTranslation} from 'react-i18next';

import {AlignedText} from '@actual-app/components/aligned-text';
import {styles} from '@actual-app/components/styles';
import {Text} from '@actual-app/components/text';
import {theme} from '@actual-app/components/theme';
import {Tooltip} from '@actual-app/components/tooltip';
import {View} from '@actual-app/components/view';
import {css} from '@emotion/css';

import {useTrackingSheetValue} from '#components/budget/tracking/TrackingBudgetComponents';
import {makeAmountFullStyle} from '#components/budget/util';
import {FinancialText} from '#components/FinancialText';
import {PrivacyFilter} from '#components/PrivacyFilter';
import {useFormat} from '#hooks/useFormat';
import {trackingBudget} from '#spreadsheet/bindings';

type SavedProps = {
  projected: boolean;
  style?: CSSProperties;
};
export function Saved({projected, style}: SavedProps) {
  const {t} = useTranslation();
  const budgetedSaved = useTrackingSheetValue(trackingBudget.totalBudgetedSaved) || 0;
  const totalSaved = useTrackingSheetValue(trackingBudget.totalSaved) || 0;
  const format = useFormat();
  const saved = projected ? budgetedSaved : totalSaved;
  const isNegative = saved < 0;
  const diff = totalSaved - budgetedSaved;

  return (
    <View style={{alignItems: 'center', fontSize: 14, ...style}}>
      {projected ? (
        <Text style={{color: theme.pageTextLight}}>
          <Trans>Projected savings:</Trans>
        </Text>
      ) : (
        <View style={{color: theme.pageTextLight}}>
          {isNegative ? t('Overspent:') : t('Saved:')}
        </View>
      )}

      <Tooltip
        style={{...styles.tooltip, fontSize: 14, padding: 10}}
        content={
          <>
            <AlignedText
              left={t('Projected savings:')}
              right={
                <FinancialText style={makeAmountFullStyle(budgetedSaved)}>
                  {format(budgetedSaved, 'financial-with-sign')}
                </FinancialText>
              }
            />
            <AlignedText
              left={t('Difference:')}
              right={
                <FinancialText style={makeAmountFullStyle(diff)}>
                  {format(diff, 'financial-with-sign')}
                </FinancialText>
              }
            />
          </>
        }
        placement="bottom"
        triggerProps={{
          isDisabled: Boolean(projected),
        }}
      >
        <View
          className={css({
            fontSize: 25,
            color: projected
              ? theme.templateNumberUnderFunded
              : isNegative
                ? theme.budgetNumberNegative
                : theme.templateNumberFunded,
          })}
        >
          <PrivacyFilter>
            <FinancialText>{format(saved, 'financial')}</FinancialText>
          </PrivacyFilter>
        </View>
      </Tooltip>
    </View>
  );
}
