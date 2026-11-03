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

import { describe, expect, it, vi } from 'vitest';

import { loadMigrationModules } from './migrations';

const migrationModule = {
  up: vi.fn(),
  down: vi.fn(),
};

describe('migrations', () => {
  it('preserves the legacy JavaScript title for a TypeScript migration', async () => {
    const migrations = await loadMigrationModules({
      '../migrations/1694360000000-create-folders.ts': async () =>
        migrationModule,
    });

    expect(Object.keys(migrations)).toEqual([
      '1694360000000-create-folders.js',
    ]);
  });

  it('rejects duplicate migration titles after normalization', async () => {
    const loader = async () => migrationModule;

    await expect(
      loadMigrationModules({
        '../migrations/example.js': loader,
        '../migrations/example.ts': loader,
      }),
    ).rejects.toThrow('Duplicate migration title: example.js');
  });
});
