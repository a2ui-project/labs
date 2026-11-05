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

import type {RemoteFile, SyncedLocalFile} from '@actual-app/core/types/file';

import {useAuth} from '#auth/AuthProvider';
import {Permissions} from '#auth/types';
import {useMultiuserEnabled} from '#components/ServerContext';
import {useMetadataPref} from '#hooks/useMetadataPref';
import {useSelector} from '#redux';

export function useCurrentAccess() {
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const allFiles = useSelector(state => state.budgetfiles.allFiles || []);
  const userData = useSelector(state => state.user.data);
  const {hasPermission} = useAuth();
  const multiuserEnabled = useMultiuserEnabled();
  const currentFile = allFiles.find(
    (file): file is SyncedLocalFile | RemoteFile =>
      (file.state === 'remote' || file.state === 'synced' || file.state === 'detached') &&
      file.cloudFileId === cloudFileId,
  );

  return {
    cloudFileId,
    isAdmin: !multiuserEnabled || hasPermission(Permissions.ADMINISTRATOR),
    isFileOwner: Boolean(userData?.userId && currentFile?.owner === userData.userId),
  };
}
