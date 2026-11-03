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

export type TemplateNotificationMessage =
  | 'templates-up-to-date'
  | 'template-errors'
  | 'templates-applied'
  | 'templates-check-passed'
  | 'cleanup-no-funds'
  | 'cleanup-up-to-date'
  | 'cleanup-applied'
  | 'cleanup-applied-with-errors';

export type TemplateNotification = {
  type?: 'message' | 'error' | 'warning' | undefined;
  pre?: string | undefined;
  title?: string | undefined;
  message: TemplateNotificationMessage;
  sticky?: boolean | undefined;
  count?: number | undefined;
  sourceCount?: number | undefined;
  sinkCount?: number | undefined;
};
