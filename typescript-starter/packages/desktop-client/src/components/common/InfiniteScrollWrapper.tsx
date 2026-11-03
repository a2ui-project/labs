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

import React, { useRef } from 'react';
import type { ReactNode, UIEvent } from 'react';

import { View } from '@actual-app/components/view';

type InfiniteScrollWrapperProps = {
  loadMore?: () => void;
  children: ReactNode;
};

/**
 * Wrapper around an infinitely loading list.
 * Calls the `loadMore` callback when the bottom of the list is reached
 * by scrolling to the bottom of the list.
 */
export function InfiniteScrollWrapper({
  loadMore,
  children,
}: InfiniteScrollWrapperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function onScroll(e: UIEvent<HTMLElement>) {
    if (
      loadMore &&
      Math.abs(
        e.currentTarget.scrollHeight -
          e.currentTarget.clientHeight -
          e.currentTarget.scrollTop,
      ) < 1
    ) {
      loadMore();
    }
  }

  return (
    <View
      style={{
        flex: 1,
        outline: 'none',
        '& .animated .animated-row': { transition: '.25s transform' },

        // Hide the last border of the item in the table
        marginBottom: -1,
      }}
      tabIndex={0}
      data-testid="table"
    >
      <View
        innerRef={scrollRef}
        style={{ maxWidth: '100%', overflow: 'auto' }}
        onScroll={onScroll}
      >
        <div>{children}</div>
      </View>
    </View>
  );
}
