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
import {Trans, useTranslation} from 'react-i18next';

import {Button} from '@actual-app/components/button';
import {SvgClose} from '@actual-app/components/icons/v1';
import {Text} from '@actual-app/components/text';
import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';

import {setAppState, updateApp} from '#app/appSlice';
import {useDispatch, useSelector} from '#redux';

import {Link} from './common/Link';

export function UpdateNotification() {
  const {t} = useTranslation();
  const updateInfo = useSelector(state => state.app.updateInfo);
  const showUpdateNotification = useSelector(state => state.app.showUpdateNotification);

  const dispatch = useDispatch();
  const onRestart = () => {
    void dispatch(updateApp());
  };

  if (updateInfo && showUpdateNotification) {
    const notes = updateInfo.releaseNotes;

    return (
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          margin: '15px 17px',
          backgroundColor: theme.pageTextPositive,
          color: theme.tableBackground,
          padding: '7px 10px',
          borderRadius: 4,
          zIndex: 10000,
          maxWidth: 450,
        }}
      >
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <View style={{marginRight: 10, fontWeight: 700}}>
            <Text>
              <Trans>App updated to {{version: updateInfo.version}}</Trans>
            </Text>
          </View>
          <View style={{flex: 1}} />
          <View style={{marginTop: -1}}>
            <Text>
              <Link
                variant="text"
                onClick={onRestart}
                style={{
                  color: theme.buttonPrimaryText,
                  textDecoration: 'underline',
                }}
              >
                <Trans>Restart</Trans>
              </Link>{' '}
              (
              <Link
                variant="text"
                style={{
                  color: theme.buttonPrimaryText,
                  textDecoration: 'underline',
                }}
                onClick={() =>
                  window.Actual.openURLInBrowser('https://actualbudget.org/docs/releases')
                }
              >
                <Trans>notes</Trans>
              </Link>
              )
              <Button
                variant="bare"
                aria-label={t('Close')}
                style={{display: 'inline', padding: '1px 7px 2px 7px'}}
                onPress={() => {
                  // Set a flag to never show an update notification again for this session
                  dispatch(
                    setAppState({
                      updateInfo: null,
                      showUpdateNotification: false,
                    }),
                  );
                }}
              >
                <SvgClose width={9} style={{color: theme.buttonPrimaryText}} />
              </Button>
            </Text>
          </View>
        </View>
        {notes && <View style={{marginTop: 10, fontWeight: 500}}>{notes}</View>}
      </View>
    );
  }

  return null;
}
