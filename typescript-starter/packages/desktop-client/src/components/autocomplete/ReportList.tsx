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
import type {ComponentProps} from 'react';
import {useTranslation} from 'react-i18next';

import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';

import {ItemHeader} from './ItemHeader';

export function ReportList<T extends {id: string; name: string}>({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
}: {
  items: T[];
  getItemProps: (arg: {item: T}) => ComponentProps<typeof View>;
  highlightedIndex: number;
  embedded?: boolean;
}) {
  const {t} = useTranslation();
  return (
    <View>
      <View
        style={{
          overflow: 'auto',
          padding: '5px 0',
          ...(!embedded && {maxHeight: 175}),
        }}
      >
        <ItemHeader title={t('Saved Reports')} />
        {items.map((item, idx) => {
          return [
            <div
              key={item.id}
              {...(getItemProps ? getItemProps({item}) : null)}
              style={{
                backgroundColor:
                  highlightedIndex === idx ? theme.menuAutoCompleteBackgroundHover : 'transparent',
                padding: 4,
                paddingLeft: 20,
                borderRadius: embedded ? 4 : 0,
              }}
              data-highlighted={highlightedIndex === idx || undefined}
            >
              {item.name}
            </div>,
          ];
        })}
      </View>
    </View>
  );
}
