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

import type { Mock } from 'vitest';

const { mockedFetch, mockedGetItem, mockedRemoveItem } = vi.hoisted(
  (): { mockedFetch: Mock; mockedGetItem: Mock; mockedRemoveItem: Mock } => ({
    mockedFetch: vi.fn(),
    mockedGetItem: vi.fn(),
    mockedRemoveItem: vi.fn(),
  }),
);

vi.unmock('#server/post');
vi.unmock('./post');

vi.mock('#platform/server/fetch', () => ({
  fetch: mockedFetch,
}));

vi.mock('#platform/server/asyncStorage', () => ({
  getItem: mockedGetItem,
  removeItem: mockedRemoveItem,
}));

describe('listRemoteFiles', () => {
  beforeEach(() => {
    vi.resetModules();
    mockedFetch.mockReset();
    mockedGetItem.mockReset().mockResolvedValue('stale-token');
    mockedRemoveItem.mockReset();
  });

  it('removes a token whose server session no longer exists', async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'error',
          reason: 'unauthorized',
          details: 'token-not-found',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const { setServer } = await import('./server-config');
    setServer('https://test.env');
    const { listRemoteFiles } = await import('./cloud-storage');
    await listRemoteFiles();

    expect(mockedGetItem).toHaveBeenCalledWith('user-token');
    expect(mockedFetch).toHaveBeenCalledOnce();
    expect(mockedRemoveItem).toHaveBeenCalledWith('user-token');
  });

  it('removes an expired token reported by an older server', async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'error',
          data: { reason: 'token-expired' },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const { setServer } = await import('./server-config');
    setServer('https://test.env');
    const { listRemoteFiles } = await import('./cloud-storage');
    await listRemoteFiles();

    expect(mockedRemoveItem).toHaveBeenCalledWith('user-token');
  });
});
