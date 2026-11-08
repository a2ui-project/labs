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

import {Block} from '@actual-app/components/block';
import {AnimatedLoading} from '@actual-app/components/icons/AnimatedLoading';
import {styles} from '@actual-app/components/styles';
import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';

type LoadingIndicatorProps = {
  message?: string;
};

export const LoadingIndicator = ({message}: LoadingIndicatorProps) => {
  return (
    <View
      style={{
        flex: 1,
        gap: 20,
        justifyContent: 'center',
        alignItems: 'center',
        ...styles.delayedFadeIn,
      }}
    >
      {message && <Block style={{marginBottom: 20, fontSize: 18}}>{message}</Block>}
      <AnimatedLoading style={{width: 25, height: 25, color: theme.pageTextDark}} />
    </View>
  );
};
