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

import {useEffect, useState} from 'react';
import type {ReactElement} from 'react';
import {Trans} from 'react-i18next';

import {View} from '@actual-app/components/view';
import type {RemoteFile, SyncedLocalFile} from '@actual-app/core/types/file';

import {useMetadataPref} from '#hooks/useMetadataPref';
import {useSelector} from '#redux';

import {useAuth} from './AuthProvider';
import type {Permissions} from './types';

type ProtectedRouteProps = {
  permission: Permissions;
  element: ReactElement;
  validateOwner?: boolean;
};

export const ProtectedRoute = ({element, permission, validateOwner}: ProtectedRouteProps) => {
  const {hasPermission} = useAuth();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const allFiles = useSelector(state => state.budgetfiles.allFiles || []);
  const remoteFiles = allFiles.filter(
    (f): f is SyncedLocalFile | RemoteFile =>
      f.state === 'remote' || f.state === 'synced' || f.state === 'detached',
  );
  const currentFile = remoteFiles.find(f => f.cloudFileId === cloudFileId);
  const userData = useSelector(state => state.user.data);

  useEffect(() => {
    const hasRequiredPermission = hasPermission(permission);
    setPermissionGranted(hasRequiredPermission);

    if (!hasRequiredPermission && validateOwner) {
      if (currentFile) {
        setPermissionGranted(currentFile.usersWithAccess.some(u => u.userId === userData?.userId));
      }
    }
  }, [cloudFileId, permission, validateOwner, hasPermission, currentFile, userData]);

  return permissionGranted ? (
    element
  ) : (
    <View
      style={{
        margin: '50px',
      }}
    >
      <h3>
        <Trans>You don't have permission to view this page</Trans>
      </h3>
    </View>
  );
};
