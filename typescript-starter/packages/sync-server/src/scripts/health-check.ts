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

import {config} from '#load-config';

const protocol = config.get('https.key') && config.get('https.cert') ? 'https' : 'http';
const hostname = config.get('hostname') === '::' ? 'localhost' : config.get('hostname');

function getHealthStatus(response: unknown): string | undefined {
  if (
    typeof response === 'object' &&
    response !== null &&
    'status' in response &&
    typeof response.status === 'string'
  ) {
    return response.status;
  }

  return undefined;
}

fetch(`${protocol}://${hostname}:${config.get('port')}/health`)
  .then(response => response.json())
  .then(response => {
    const status = getHealthStatus(response);

    if (status !== 'UP') {
      throw new Error(
        'Health check failed: Server responded to health check with status ' + status,
      );
    }
  })
  .catch(err => {
    console.log('Health check failed:', err);
    process.exit(1);
  });
