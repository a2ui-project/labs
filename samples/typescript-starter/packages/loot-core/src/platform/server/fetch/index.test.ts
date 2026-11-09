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

import {fetch} from '#platform/server/fetch';

describe('electron fetch', () => {
  const globalFetch = vi.fn();

  beforeEach(() => {
    globalFetch.mockReset();
    globalFetch.mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', globalFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the app://actual origin', async () => {
    await fetch('https://sync.example.com/gocardless/create-web-token', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
    });

    expect(globalFetch).toHaveBeenCalledWith(
      'https://sync.example.com/gocardless/create-web-token',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          origin: 'app://actual',
        },
      }),
    );
  });
});
