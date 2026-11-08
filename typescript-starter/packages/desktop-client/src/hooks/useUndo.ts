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

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';

import {useResponsive} from '@actual-app/components/hooks/useResponsive';

import {addNotification} from '#notifications/notificationsSlice';
import type {Notification} from '#notifications/notificationsSlice';
import {useDispatch} from '#redux';
import {redo, undo} from '#undo';

type UndoActions = {
  undo: () => void;
  redo: () => void;
  showUndoNotification: (undoNotification: Notification) => void;
  showRedoNotification: (redoNotification: Notification) => void;
};

const timeout = 10000;

export function useUndo(): UndoActions {
  const dispatch = useDispatch();
  const {isNarrowWidth} = useResponsive();
  const {t} = useTranslation();

  const showUndoNotification = useCallback(
    (notification: Notification) => {
      if (!isNarrowWidth) {
        return;
      }

      dispatch(
        addNotification({
          notification: {
            type: 'message',
            timeout,
            button: {
              title: t('Undo'),
              action: undo,
            },
            ...notification,
          },
        }),
      );
    },
    [dispatch, isNarrowWidth, t],
  );

  const showRedoNotification = useCallback(
    (notification: Notification) => {
      if (!isNarrowWidth) {
        return;
      }

      dispatch(
        addNotification({
          notification: {
            type: 'message',
            timeout,
            button: {
              title: t('Redo'),
              action: redo,
            },
            ...notification,
          },
        }),
      );
    },
    [dispatch, isNarrowWidth, t],
  );

  return {
    undo,
    redo,
    showUndoNotification,
    showRedoNotification,
  };
}
