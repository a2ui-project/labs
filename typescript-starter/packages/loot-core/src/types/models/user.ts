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

export type NewUserEntity = {
  userName: string;
  displayName: string;
  role: string;
  enabled: boolean;
};

export type UserEntity = {
  id: string;
  owner: boolean;
} & NewUserEntity;

export type UserEntityDropdown = {
  userId: string;
  userName: string;
  displayName?: string;
};

export type UserAvailable = {
  userId: string;
  displayName?: string;
  userName: string;
  haveAccess?: number;
  owner?: number;
};
