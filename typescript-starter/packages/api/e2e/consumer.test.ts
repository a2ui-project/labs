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

import { expect, test } from '@playwright/test';

// Loads the consumer fixture's production build (built in global-setup.ts,
// served by serve-dist.mjs with COOP/COEP). On master this fails: the consumer
// bundler re-bundles the prebuilt worker and `init` throws a structured-clone
// error. With the self-contained build it passes with no consumer config.
test('a consumer production build boots the worker and seeds a budget', async ({
  page,
}) => {
  await page.goto('/e2e/consumer/dist/index.html');
  const out = page.locator('#out');
  await expect(out).toHaveAttribute('data-state', 'ok', { timeout: 60_000 });
  await expect(out).toContainText('Checking');
});
