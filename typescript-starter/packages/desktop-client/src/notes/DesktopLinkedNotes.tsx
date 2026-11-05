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

import type {MouseEvent} from 'react';
import {useTranslation} from 'react-i18next';

import {theme} from '@actual-app/components/theme';
import {isElectron} from '@actual-app/core/shared/environment';

import {Link} from '#components/common/Link';
import {addNotification} from '#notifications/notificationsSlice';
import {useDispatch} from '#redux';

import {normalizeUrl} from './linkParser';

type DesktopLinkedNotesProps = {
  displayText: string;
  url: string;
  separator: string;
  isFilePath: boolean;
};

export function DesktopLinkedNotes({
  displayText,
  url,
  separator,
  isFilePath,
}: DesktopLinkedNotesProps) {
  const dispatch = useDispatch();
  const {t} = useTranslation();

  const handleClick = async (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isFilePath) {
      if (isElectron()) {
        // Open file in file manager
        window.Actual?.openInFileManager(url);
      } else {
        // Browser fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        dispatch(
          addNotification({
            notification: {
              type: 'message',
              message: t('File path copied to clipboard'),
            },
          }),
        );
      }
    } else {
      // Open URL in browser
      const normalizedUrl = normalizeUrl(url);
      window.Actual?.openURLInBrowser(normalizedUrl);
    }
  };

  return (
    <>
      <Link
        variant="text"
        onClick={handleClick}
        style={{
          color: theme.pageTextLink,
          textDecoration: 'underline',
          cursor: 'pointer',
          '&:hover': {
            color: theme.pageTextLinkLight,
          },
        }}
      >
        {displayText}
      </Link>
      {separator}
    </>
  );
}
