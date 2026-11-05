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

import '@testing-library/jest-dom/vitest';
import type {ReactNode} from 'react';

import {resetTestProviders} from './mocks';

global.IS_TESTING = true;
global.Actual = {} as typeof global.Actual;

// jsdom doesn't implement ResizeObserver. Components that only use it to
// react to layout changes (rather than asserting on it) can run against a
// no-op stub.
global.ResizeObserver = class {
  observe() {
    // no-op
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
};

type Size = {height: number; width: number};

type AutoSizerProps = {
  renderProp?: (size: Size) => ReactNode;
  children?: (size: Size) => ReactNode;
};

vi.mock('react-virtualized-auto-sizer', () => {
  const AutoSizer = (props: AutoSizerProps) => {
    const render = props.renderProp ?? props.children;
    return render ? render({height: 1000, width: 600}) : null;
  };

  return {
    AutoSizer,
    default: AutoSizer,
  };
});

global.Date.now = () => 123456789;

global.__resetWorld = () => {
  resetTestProviders();
};

process.on('unhandledRejection', (reason: unknown) => {
  console.error('REJECTION', reason);
});

afterEach(() => {
  global.__resetWorld();
});
