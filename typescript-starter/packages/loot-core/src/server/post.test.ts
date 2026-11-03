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

import { fetch } from '#platform/server/fetch';

import { PostError } from './errors';
import { del, patch, post, postBinary } from './post';

vi.unmock('#server/post');
vi.mock('#platform/server/fetch', () => ({
  fetch: vi.fn(),
}));

const mockedFetch = vi.mocked(fetch);

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return null;
  } catch (err) {
    return err;
  }
}

describe('postBinary', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('does not set Content-Length manually and lets fetch derive it', async () => {
    mockedFetch.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    );

    await postBinary('https://test.env/sync/sync', new Uint8Array([9, 9, 9]), {
      'X-ACTUAL-TOKEN': 'token',
    });

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const options = mockedFetch.mock.calls[0][1];
    expect(options?.headers).not.toHaveProperty('Content-Length');
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/actual-sync',
      'X-ACTUAL-TOKEN': 'token',
    });
  });

  it('preserves the underlying fetch error as cause on network failure', async () => {
    const underlying = new TypeError('fetch failed');
    mockedFetch.mockRejectedValue(underlying);

    const error = await captureError(
      postBinary('https://test.env/sync/sync', new Uint8Array([1]), {}),
    );

    expect(error).toBeInstanceOf(PostError);
    expect((error as PostError).reason).toBe('network-failure');
    expect((error as PostError).cause).toBe(underlying);
  });

  it('treats a missing server session as an expired token', async () => {
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

    const error = await captureError(
      postBinary('https://test.env/sync/sync', new Uint8Array([1]), {}),
    );

    expect(error).toBeInstanceOf(PostError);
    expect((error as PostError).reason).toBe('token-expired');
  });
});

describe('post', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('preserves the underlying fetch error as cause on network failure', async () => {
    const underlying = new TypeError('fetch failed');
    mockedFetch.mockRejectedValue(underlying);

    const error = await captureError(
      post('https://test.env/sync/sync', { foo: 'bar' }),
    );

    expect(error).toBeInstanceOf(PostError);
    expect((error as PostError).reason).toBe('network-failure');
    expect((error as PostError).cause).toBe(underlying);
  });
});

describe('del', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('preserves the underlying fetch error as cause on network failure', async () => {
    const underlying = new TypeError('fetch failed');
    mockedFetch.mockRejectedValue(underlying);

    const error = await captureError(
      del('https://test.env/sync/sync', { foo: 'bar' }),
    );

    expect(error).toBeInstanceOf(PostError);
    expect((error as PostError).reason).toBe('network-failure');
    expect((error as PostError).cause).toBe(underlying);
  });
});

describe('patch', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('preserves the underlying fetch error as cause on network failure', async () => {
    const underlying = new TypeError('fetch failed');
    mockedFetch.mockRejectedValue(underlying);

    const error = await captureError(
      patch('https://test.env/sync/sync', { foo: 'bar' }),
    );

    expect(error).toBeInstanceOf(PostError);
    expect((error as PostError).reason).toBe('network-failure');
    expect((error as PostError).cause).toBe(underlying);
  });
});
