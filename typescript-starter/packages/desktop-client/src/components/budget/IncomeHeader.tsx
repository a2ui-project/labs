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
import {Trans} from 'react-i18next';

import {Button} from '@actual-app/components/button';
import {View} from '@actual-app/components/view';

import {useGlobalPref} from '#hooks/useGlobalPref';

import {RenderMonths} from './RenderMonths';

import {useBudgetComponents} from '.';

type IncomeHeaderProps = {
  onShowNewGroup: () => void;
};

export function IncomeHeader({onShowNewGroup}: IncomeHeaderProps) {
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;
  const {IncomeHeaderComponent: MonthComponent} = useBudgetComponents();
  return (
    <View style={{flexDirection: 'row', flex: 1}}>
      <View
        style={{
          width: 200 + 100 * categoryExpandedState,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}
      >
        <Button onPress={onShowNewGroup} style={{fontSize: 12, margin: 10}}>
          <Trans>Add group</Trans>
        </Button>
      </View>
      <RenderMonths style={{border: 0, justifyContent: 'flex-end'}}>
        <MonthComponent />
      </RenderMonths>
    </View>
  );
}
