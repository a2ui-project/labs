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

import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import type { Menu } from '@actual-app/components/menu';

import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type DashboardWidgetCopyMenuResult = {
  /** Menu items to add to the card's menu */
  menuItems: ComponentProps<typeof Menu<string>>['items'];
  /** Handler for menu selection - call this from onMenuSelect */
  handleMenuSelect: (item: string) => boolean;
};

export function useDashboardWidgetCopyMenu(
  onCopy: (targetDashboardId: string) => void,
): DashboardWidgetCopyMenuResult {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const menuItems: ComponentProps<typeof Menu<string>>['items'] = [
    {
      name: 'copy-to-dashboard',
      text: t('Copy to dashboard'),
    },
  ];

  const handleMenuSelect = (item: string): boolean => {
    switch (item) {
      case 'copy-to-dashboard':
        dispatch(
          pushModal({
            modal: {
              name: 'copy-widget-to-dashboard',
              options: {
                onSelect: targetDashboardId => {
                  onCopy(targetDashboardId);
                },
              },
            },
          }),
        );
        return true;
      default:
        return false;
    }
  };

  return {
    menuItems,
    handleMenuSelect,
  };
}
