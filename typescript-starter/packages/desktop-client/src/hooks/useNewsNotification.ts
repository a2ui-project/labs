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

import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {useLocation} from 'react-router';

import {getNewestDate, getReleaseToNotify} from '#news/utils';
import {addNotification, removeNotification} from '#notifications/notificationsSlice';
import {useDispatch} from '#redux';

import {useGlobalPref} from './useGlobalPref';
import {useNavigate} from './useNavigate';
import {useNewsFeed} from './useNewsFeed';

const NOTIFICATION_ID = 'news-release-notification';
const NOTIFICATIONS_PAGE_PATH = '/notifications';

/**
 * Shows a sticky notification the first time a new release that the user is
 * already running appears in the news feed. Does nothing while the news feed
 * is disabled (the user turned it off in settings).
 */
export function useNewsNotification() {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const {isEnabled, entries} = useNewsFeed();
  const [lastSeenNewsDate, setLastSeenNewsDate] = useGlobalPref('lastSeenNewsDate');

  // Reaching the page (via the bell, settings, or the notification itself)
  // makes the notification redundant.
  useEffect(() => {
    if (location.pathname === NOTIFICATIONS_PAGE_PATH) {
      dispatch(removeNotification({id: NOTIFICATION_ID}));
    }
  }, [dispatch, location.pathname]);

  useEffect(() => {
    if (!isEnabled || entries.length === 0) {
      return;
    }

    if (!lastSeenNewsDate) {
      // First time the feature is enabled: record where the feed currently is
      // rather than notifying about old news. From here on only newer entries
      // count as unseen.
      const newestDate = getNewestDate(entries);
      if (newestDate) {
        setLastSeenNewsDate(newestDate);
      }
      return;
    }

    const release = getReleaseToNotify(entries, window.Actual.ACTUAL_VERSION, lastSeenNewsDate);
    if (!release) {
      return;
    }

    dispatch(
      addNotification({
        notification: {
          type: 'message',
          id: NOTIFICATION_ID,
          sticky: true,
          title: t("What's new in Actual {{version}}", {
            version: release.version,
          }),
          message: t(
            'You are now running a new version of Actual. Take a look at what has changed.',
          ),
          button: {
            title: t("See what's new"),
            action: () => {
              void navigate(NOTIFICATIONS_PAGE_PATH);
            },
          },
          // Only this release has been seen. Recording the newest feed date
          // instead would hide releases that are newer than the running
          // client until they were also installed.
          onClose: () => setLastSeenNewsDate(release.date),
        },
      }),
    );
  }, [dispatch, entries, isEnabled, lastSeenNewsDate, navigate, setLastSeenNewsDate, t]);
}
