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

const isWindows =
  typeof navigator !== 'undefined' &&
  navigator.platform &&
  navigator.platform.toLowerCase() === 'win32';

const isMac =
  typeof navigator !== 'undefined' &&
  navigator.platform &&
  navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const isPlaywright =
  typeof navigator !== 'undefined' && navigator.userAgent.includes('playwright');

export const OS: 'windows' | 'mac' | 'linux' | 'unknown' = isWindows
  ? 'windows'
  : isMac
    ? 'mac'
    : 'linux';
export const env: 'web' | 'mobile' | 'unknown' = 'web';
export const isBrowser: boolean = true;

const userAgent = navigator.userAgent;

// True for all browsers on iOS (iPhone/iPad/iPod) — not macOS.
export const isIOS = /iP(hone|ad|od)/.test(userAgent);

export const isAndroid = /Android/.test(userAgent);

// True only for Safari on iOS — Chrome (CriOS), Firefox (FxiOS), Edge (EdgiOS),
// etc. carry their own tokens and are excluded.
export const isIOSAgent =
  isIOS &&
  /Safari/.test(userAgent) &&
  /Mobile\//.test(userAgent) &&
  !/(CriOS|FxiOS|EdgiOS|OPiOS|mercury)/.test(userAgent);
