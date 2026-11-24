// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import fs from 'node:fs';
import path from 'node:path';

import {expect, test} from '@playwright/test';

import {record} from './replay';

// The record run calls the model, so it runs only with the key. The checker removes *_KEY variables.
test.skip(!process.env.A2UI_RECORD_KEY, 'A2UI_RECORD_KEY is not set.');
// A trace keeps the request headers, and with them the key.
test.use({trace: 'off', screenshot: 'off', video: 'off'});
test.setTimeout(600_000);

test('records the newsletter list from a live model', async ({page}) => {
  const request = 'Which newsletters can I subscribe to? Show them on a card.';
  const errors = page.locator('li[data-kind="error"]');
  await page.addInitScript(
    key => localStorage.setItem('a2ui-gemini-key', key),
    process.env.A2UI_RECORD_KEY!,
  );
  const recorder = record(page, console.log);
  await page.goto('/');
  const started = page.waitForResponse(
    response => new URL(response.url()).hostname === 'generativelanguage.googleapis.com',
  );
  await page.getByRole('textbox', {name: 'Message'}).fill(request);
  await page.getByRole('button', {name: 'Send'}).click();
  await started;
  // An error entry also ends the wait, so that no error turn uses a request.
  await page
    .getByRole('button', {name: 'Send', disabled: false})
    .or(errors)
    .first()
    .waitFor({timeout: 300_000});

  // A failed turn fails the test here, so it leaves no fixture.
  expect(await errors.allTextContents()).toEqual([]);
  await expect(page.locator('li[data-kind="surface"]')).toHaveCount(1);
  const file = path.join(path.dirname(test.info().file), 'fixtures', 'live.json');
  fs.writeFileSync(file, JSON.stringify(await recorder.fixture(request), null, 1) + '\n');
});
