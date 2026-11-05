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

import {useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';

import {useResponsive} from '@actual-app/components/hooks/useResponsive';

import {useIsTestEnv} from '#hooks/useIsTestEnv';
import {useLocalPref} from '#hooks/useLocalPref';
import {addNotification} from '#notifications/notificationsSlice';
import {useDispatch} from '#redux';

import {TOUR_OFFER_NOTIFICATION_ID, useTour} from './TourProvider';

export function TourAutoOffer() {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const {isNarrowWidth} = useResponsive();
  const isTestEnv = useIsTestEnv();
  const {startTour} = useTour();
  const [introSeen, setIntroSeen] = useLocalPref('tour.introSeen');
  const hasOffered = useRef(false);

  useEffect(() => {
    if (hasOffered.current || introSeen || isNarrowWidth || isTestEnv) {
      return;
    }
    hasOffered.current = true;
    dispatch(
      addNotification({
        notification: {
          id: TOUR_OFFER_NOTIFICATION_ID,
          type: 'message',
          sticky: true,
          title: t('Welcome to {{appName}}!', {appName: 'Actual'}),
          message: t(
            'New to {{appName}}? Take a short tour to learn how budgeting works and find your way around.',
            {appName: 'Actual'},
          ),
          button: {
            title: t('Take the tour'),
            action: () => startTour(),
          },
          onClose: () => setIntroSeen(true),
        },
      }),
    );
  }, [dispatch, introSeen, isNarrowWidth, isTestEnv, setIntroSeen, startTour, t]);

  return null;
}
