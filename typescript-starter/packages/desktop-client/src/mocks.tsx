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

import React from 'react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { configureAppStore } from './redux/store';
import type { AppStore } from './redux/store';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

export function configureTestAppStore(
  ...args: Parameters<typeof configureAppStore>
) {
  return configureAppStore(...args);
}

let testQueryClient = createTestQueryClient();
let testStore = configureTestAppStore({
  queryClient: testQueryClient,
});

export function resetTestProviders() {
  testQueryClient = createTestQueryClient();
  testStore = configureTestAppStore({ queryClient: testQueryClient });
}

export function createTestAppStore() {
  return configureAppStore({
    queryClient: testQueryClient,
  });
}

export function TestProviders({
  children,
  queryClient,
  store,
}: {
  queryClient?: QueryClient;
  store?: AppStore;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient ?? testQueryClient}>
      <Provider store={store ?? testStore}>{children}</Provider>
    </QueryClientProvider>
  );
}
