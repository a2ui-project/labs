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

export function isPreviewEnvironment() {
  return String(process.env.REACT_APP_NETLIFY) === 'true';
}

export function isDevelopmentEnvironment() {
  return process.env.NODE_ENV === 'development';
}

export function isNonProductionEnvironment() {
  return isPreviewEnvironment() || isDevelopmentEnvironment();
}

export function isElectron() {
  if (
    typeof navigator !== 'undefined' &&
    navigator.userAgent.indexOf('Electron') >= 0
  ) {
    return true;
  }
  return false;
}
