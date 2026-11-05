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

import type {RefObject} from 'react';

import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Mock} from 'vitest';

import {addItems} from '#contextmenu/contextMenuSlice';
import {useRefEventListener} from '#hooks/useRefEventListener';
import {useDispatch} from '#redux';

import {useContextMenu} from './useContextMenu';

// Mock dependencies
vi.mock('#redux', () => ({
  useDispatch: vi.fn(),
  useSelector: vi.fn(),
}));

vi.mock('#hooks/useRefEventListener', () => ({
  useRefEventListener: vi.fn(),
}));

describe('useContextMenu', () => {
  let mockDispatch: Mock;
  let mockTriggerRef: {
    current: {getBoundingClientRect: Mock; dispatchEvent: Mock};
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch = vi.fn();
    (useDispatch as unknown as Mock).mockReturnValue(mockDispatch);

    mockTriggerRef = {
      current: {
        getBoundingClientRect: vi.fn(() => ({x: 100, y: 200, height: 50})),
        dispatchEvent: vi.fn(),
      },
    };
  });

  it('should register contextmenu event listener on triggerRef', () => {
    const items = [{name: 'test', text: 'Test', onClick: vi.fn()}];

    renderHook(() =>
      useContextMenu({
        triggerRef: mockTriggerRef as unknown as RefObject<HTMLElement | null>,
        items,
      }),
    );

    expect(useRefEventListener).toHaveBeenCalledWith(
      mockTriggerRef,
      'contextmenu',
      expect.any(Function),
    );
  });

  it('should dispatch addItems when contextmenu event is fired and enabled is true', () => {
    const items = [{name: 'test', text: 'Test', onClick: vi.fn()}];

    renderHook(() =>
      useContextMenu({
        triggerRef: mockTriggerRef as unknown as RefObject<HTMLElement | null>,
        items,
      }),
    );

    const listener = (useRefEventListener as Mock).mock.calls[0][2];

    // Simulate event
    listener({
      preventDefault: vi.fn(),
      clientX: 100,
      clientY: 200,
    } as unknown as MouseEvent);

    expect(mockDispatch).toHaveBeenCalledWith(addItems(items));
  });

  it('should not dispatch addItems when enabled is false', () => {
    const items = [{name: 'test', text: 'Test', onClick: vi.fn()}];

    renderHook(() =>
      useContextMenu({
        triggerRef: mockTriggerRef as unknown as RefObject<HTMLElement | null>,
        enabled: false,
        items,
      }),
    );

    const listener = (useRefEventListener as Mock).mock.calls[0][2];

    // Simulate event
    listener({
      preventDefault: vi.fn(),
      clientX: 100,
      clientY: 200,
    } as unknown as MouseEvent);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should provide handleContextMenu callback that dispatches contextmenu event', () => {
    const items = [{name: 'test', text: 'Test', onClick: vi.fn()}];

    const {result} = renderHook(() =>
      useContextMenu({
        triggerRef: mockTriggerRef as unknown as RefObject<HTMLElement | null>,
        items,
      }),
    );

    act(() => {
      result.current.handleContextMenu();
    });

    expect(mockTriggerRef.current.getBoundingClientRect).toHaveBeenCalled();
    expect(mockTriggerRef.current.dispatchEvent).toHaveBeenCalled();

    const dispatchedEvent = mockTriggerRef.current.dispatchEvent.mock.calls[0][0];
    expect(dispatchedEvent.type).toBe('contextmenu');
    expect(dispatchedEvent.clientX).toBe(100);
    expect(dispatchedEvent.clientY).toBe(250); // y + height (200 + 50)
  });

  it('handleContextMenu should do nothing if enabled is false', () => {
    const items = [{name: 'test', text: 'Test', onClick: vi.fn()}];

    const {result} = renderHook(() =>
      useContextMenu({
        triggerRef: mockTriggerRef as unknown as RefObject<HTMLElement | null>,
        enabled: false,
        items,
      }),
    );

    act(() => {
      result.current.handleContextMenu();
    });

    expect(mockTriggerRef.current.dispatchEvent).not.toHaveBeenCalled();
  });
});
