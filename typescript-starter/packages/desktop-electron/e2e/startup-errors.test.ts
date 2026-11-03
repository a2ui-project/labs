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

import { expect } from '@playwright/test';

import { test } from './fixtures';

test.describe('Startup errors', () => {
  test.use({ blockDocumentDir: true });

  test('shows which folder could not be used when the data folder is blocked', async ({
    electronPage,
  }) => {
    await expect(
      electronPage.getByText('Data folder unavailable'),
    ).toBeVisible();

    await expect(
      electronPage.getByText(
        "Actual couldn't access the folder where it stores your budget files:",
      ),
    ).toBeVisible();

    // The failing path is `<ACTUAL_DOCUMENT_DIR>/Actual`, where
    // ACTUAL_DOCUMENT_DIR points at a regular file named `blocked`.
    await expect(electronPage.getByText(/blocked[\\/]Actual$/)).toBeVisible();

    await expect(
      electronPage.getByRole('button', { name: 'Choose a different folder' }),
    ).toBeVisible();
    await expect(
      electronPage.getByRole('button', { name: 'Restart app' }),
    ).toBeVisible();
  });
});
