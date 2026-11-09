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
import {animated, useTransition} from 'react-spring';

import {Block} from '@actual-app/components/block';
import {AnimatedLoading} from '@actual-app/components/icons/AnimatedLoading';
import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';
import {css} from '@emotion/css';

import {useSelector} from '#redux';

import {Background} from './Background';

type AppBackgroundProps = {
  isLoading?: boolean;
};

export function AppBackground({isLoading}: AppBackgroundProps) {
  const loadingText = useSelector(state => state.app.loadingText);
  const showLoading = isLoading || loadingText !== null;
  const transitions = useTransition(loadingText, {
    from: {opacity: 0, transform: 'translateY(-100px)'},
    enter: {opacity: 1, transform: 'translateY(0)'},
    leave: {opacity: 0, transform: 'translateY(100px)'},
  });

  return (
    <>
      <Background />

      {showLoading &&
        transitions((style, item) => (
          <animated.div key={item} style={style}>
            <View
              className={css({
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: 50,
                paddingTop: 200,
                color: theme.pageText,
                alignItems: 'center',
              })}
            >
              <Block style={{marginBottom: 20, fontSize: 18}}>{loadingText}</Block>
              <AnimatedLoading width={25} color={theme.pageText} />
            </View>
          </animated.div>
        ))}
    </>
  );
}
