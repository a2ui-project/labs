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

import type {UsersWithAccess} from '#server/cloud-storage';

import type {Budget} from './budget';

export type FileState = 'local' | 'remote' | 'synced' | 'detached' | 'broken' | 'unknown';

export type LocalFile = Omit<Budget, 'cloudFileId' | 'groupId'> & {
  state: 'local';
  hasKey: boolean;
};

export type SyncableLocalFile = Budget & {
  cloudFileId: string;
  groupId: string;
  state: 'broken' | 'unknown';
  hasKey: boolean;
  owner: string;
};

export type SyncedLocalFile = Budget & {
  cloudFileId: string;
  groupId: string;
  encryptKeyId?: string;
  hasKey: boolean;
  state: 'synced' | 'detached';
  owner: string;
  usersWithAccess: UsersWithAccess[];
};

export type RemoteFile = {
  cloudFileId: string;
  groupId: string;
  name: string;
  encryptKeyId?: string;
  hasKey: boolean;
  state: 'remote';
  owner: string;
  usersWithAccess: UsersWithAccess[];
};

export type File = LocalFile | SyncableLocalFile | SyncedLocalFile | RemoteFile;
