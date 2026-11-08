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
import {useTranslation} from 'react-i18next';

import {Menu} from '@actual-app/components/menu';

import type {SavedFilter} from './SavedFilterMenuButton';

export function FilterMenu({
  filterId,
  onFilterMenuSelect,
}: {
  filterId?: SavedFilter;
  onFilterMenuSelect: (item: string) => void;
}) {
  const {t} = useTranslation();

  return (
    <Menu
      onMenuSelect={item => {
        onFilterMenuSelect(item);
      }}
      items={
        !filterId?.id
          ? [
              {name: 'save-filter', text: t('Save new filter')},
              {name: 'clear-filter', text: t('Clear all conditions')},
            ]
          : filterId?.id !== null && filterId?.status === 'saved'
            ? [
                {name: 'rename-filter', text: t('Rename')},
                {name: 'delete-filter', text: t('Delete')},
                Menu.line,
                {
                  name: 'save-filter',
                  text: t('Save new filter'),
                  disabled: true,
                },
                {name: 'clear-filter', text: t('Clear all conditions')},
              ]
            : [
                {name: 'rename-filter', text: t('Rename')},
                {name: 'update-filter', text: t('Update conditions')},
                {name: 'reload-filter', text: t('Revert changes')},
                {name: 'delete-filter', text: t('Delete')},
                Menu.line,
                {name: 'save-filter', text: t('Save new filter')},
                {name: 'clear-filter', text: t('Clear all conditions')},
              ]
      }
    />
  );
}
