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

import type { ComponentType, SVGProps } from 'react';

import {
  SvgChartPie,
  SvgEquals,
  SvgFlag,
  SvgMoneyBag,
  SvgPiggyBank,
  SvgShare,
  SvgTime,
} from '@actual-app/components/icons/v1';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
} from '@actual-app/components/icons/v2';
import { t } from 'i18next';

import type { DisplayTemplateType } from './constants';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type DisplayTemplateMeta = {
  label: string;
  description: string;
  icon: IconComponent;
};

export function getDisplayTemplateMeta(
  displayType: DisplayTemplateType,
): DisplayTemplateMeta {
  switch (displayType) {
    case 'fixed':
      return {
        label: t('Fixed amount'),
        description: t('Add a set amount every month, week, day, or year.'),
        icon: SvgPiggyBank,
      };
    case 'schedule':
      return {
        label: t('Cover schedule'),
        description: t('Save up for a scheduled transaction.'),
        icon: SvgCalendar3,
      };
    case 'by':
      return {
        label: t('Save by date'),
        description: t(
          'Spread a target amount across the months until a deadline.',
        ),
        icon: SvgMoneyBag,
      };
    case 'percentage':
      return {
        label: t('% of income'),
        description: t("A share of this month's or last month's income."),
        icon: SvgChartPie,
      };
    case 'historical':
      return {
        label: t('From history'),
        description: t(
          'Use past months: average, a specific month, or a copy.',
        ),
        icon: SvgTime,
      };
    case 'limit':
      return {
        label: t('Balance cap'),
        description: t(
          'Stop budgeting to this category once the balance reaches a cap.',
        ),
        icon: SvgEquals,
      };
    case 'refill':
      return {
        label: t('Refill to cap'),
        description: t(
          'Top the category back up to the balance cap each month.',
        ),
        icon: SvgArrowsSynchronize,
      };
    case 'remainder':
      return {
        label: t('Whatever is left'),
        description: t(
          'Split any remaining To Budget across these categories.',
        ),
        icon: SvgShare,
      };
    case 'goal':
      return {
        label: t('Long-term goal'),
        description: t(
          'Set a long-term savings target. This changes the coloring of the balance on the budget page to be based on progress towards the target rather than the current month funding progress.',
        ),
        icon: SvgFlag,
      };
    default:
      displayType satisfies never;
      throw new Error(`Unknown display type: ${String(displayType)}`);
  }
}
