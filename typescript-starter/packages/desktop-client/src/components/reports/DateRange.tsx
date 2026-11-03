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
import type { ReactElement } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import * as monthUtils from '@actual-app/core/shared/months';
import * as d from 'date-fns';

import { useLocale } from '#hooks/useLocale';

type DateRangeProps = {
  start: string;
  end: string;
  type?: string;
  comparisonLabel?: string;
};

function checkDate(date: string) {
  const dateParsed = monthUtils.parseDate(date);
  if (dateParsed) {
    return d.format(dateParsed, 'yyyy-MM-dd');
  } else {
    return null;
  }
}

export function DateRange({
  start,
  end,
  type,
  comparisonLabel,
}: DateRangeProps): ReactElement {
  const { t } = useTranslation();
  const locale = useLocale();
  const checkStart = checkDate(start);
  const checkEnd = checkDate(end);

  let startDate;
  let endDate;
  if (checkStart && checkEnd) {
    startDate = d.parseISO(checkStart);
    endDate = d.parseISO(checkEnd);
  } else {
    return (
      <Text style={{ ...styles.mediumText, color: theme.errorText }}>
        <Trans>There was a problem loading your date range</Trans>
      </Text>
    );
  }

  const formattedStartDate = d.format(startDate, 'MMM yyyy', { locale });
  const formattedEndDate = d.format(endDate, 'MMM yyyy', { locale });
  let typeOrFormattedEndDate: string;

  if (type && ['budget', 'average'].includes(type)) {
    typeOrFormattedEndDate =
      comparisonLabel ?? (type === 'budget' ? t('budgeted') : t('average'));
  } else {
    typeOrFormattedEndDate = formattedEndDate;
  }

  let content: string | ReactElement;
  if (['budget', 'average'].includes(type || '')) {
    content = (
      <div>
        <Trans>
          Compare {{ formattedStartDate }} to {{ typeOrFormattedEndDate }}
        </Trans>
      </div>
    );
  } else if (
    startDate.getFullYear() !== endDate.getFullYear() ||
    startDate.getMonth() !== endDate.getMonth()
  ) {
    content = (
      <div>
        {type ? (
          <Trans>
            Compare {{ formattedStartDate }} to {{ typeOrFormattedEndDate }}
          </Trans>
        ) : (
          <>
            {formattedStartDate} - {formattedEndDate}
          </>
        )}
      </div>
    );
  } else {
    content = d.format(endDate, 'MMMM yyyy', { locale });
  }

  return <Block style={{ color: theme.pageTextSubdued }}>{content}</Block>;
}
