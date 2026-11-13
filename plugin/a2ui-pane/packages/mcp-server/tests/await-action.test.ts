/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {describe, it, expect, vi} from 'vitest';
import {handleAwaitA2uiAction} from '../src/tools/await-action.js';
import type {ActionEndpoint} from '../src/action-endpoint.js';

describe('handleAwaitA2uiAction', () => {
  it('rejects invalid conversationId with structured error', async () => {
    const res = await handleAwaitA2uiAction({
      conversationId: '../malicious-id',
      surfaceId: 'surf1',
    });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Invalid conversationId');
  });

  it('rejects invalid surfaceId with structured error', async () => {
    const res = await handleAwaitA2uiAction({
      conversationId: 'valid-conv',
      surfaceId: '../bad-surf',
    });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Invalid surfaceId');
  });

  it('returns unavailable status when ActionEndpoint is not provided', async () => {
    const res = await handleAwaitA2uiAction({
      conversationId: 'valid-conv',
      surfaceId: 'valid-surf',
    });
    expect(res.isError).toBeUndefined();
    const data = JSON.parse(res.content[0].text);
    expect(data.status).toBe('unavailable');
    expect(data.message).toContain('A2UI action side-channel is not enabled');
  });

  it('delegates to endpoint.awaitAction and returns received result', async () => {
    const mockEndpoint = {
      awaitAction: vi.fn().mockResolvedValue({
        status: 'received',
        surfaceId: 'valid-surf',
        action: {name: 'confirmChoice'},
        dataModel: {choice: 'apple'},
      }),
    } as unknown as ActionEndpoint;

    const res = await handleAwaitA2uiAction(
      {
        conversationId: 'valid-conv',
        surfaceId: 'valid-surf',
        timeoutSeconds: 45,
      },
      mockEndpoint,
    );

    expect(mockEndpoint.awaitAction).toHaveBeenCalledWith('valid-conv', 'valid-surf', 45);
    expect(res.isError).toBeUndefined();
    const data = JSON.parse(res.content[0].text);
    expect(data.status).toBe('received');
    expect(data.action.name).toBe('confirmChoice');
    expect(data.dataModel.choice).toBe('apple');
  });

  it('uses default timeoutSeconds of 300 when omitted', async () => {
    const mockEndpoint = {
      awaitAction: vi.fn().mockResolvedValue({
        status: 'timeout',
        message: 'Timed out',
      }),
    } as unknown as ActionEndpoint;

    await handleAwaitA2uiAction(
      {
        conversationId: 'valid-conv',
        surfaceId: 'valid-surf',
      },
      mockEndpoint,
    );

    expect(mockEndpoint.awaitAction).toHaveBeenCalledWith('valid-conv', 'valid-surf', 300);
  });
});
