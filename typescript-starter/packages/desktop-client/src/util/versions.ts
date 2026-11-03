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

// @ts-strict-ignore
import * as Platform from '@actual-app/core/shared/platform';

function parseSemanticVersion(versionString): [number, number, number] {
  return versionString
    .replace('v', '')
    .split('.')
    .map(n => parseInt(n));
}

export function cmpSemanticVersion(
  versionStringA: string,
  versionStringB: string,
): number {
  const x = parseSemanticVersion(versionStringA);
  const y = parseSemanticVersion(versionStringB);

  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

export async function getLatestVersion(): Promise<string | 'unknown'> {
  if (Platform.isPlaywright || import.meta.env.REACT_APP_REVIEW_ID) {
    return Promise.resolve('v99.9.9');
  }

  try {
    const response = await fetch(
      'https://api.github.com/repos/actualbudget/actual/releases/latest',
    );
    const json = await response.json();
    return json?.tag_name ?? 'unknown';
  } catch {
    // Rate limit exceeded? Or perhaps GitHub is down?
    return 'unknown';
  }
}

export function getIsOutdated(latestVersion: string): boolean {
  const clientVersion = window.Actual.ACTUAL_VERSION;
  if (latestVersion === 'unknown') {
    return false;
  }
  return cmpSemanticVersion(clientVersion, latestVersion) < 0;
}
