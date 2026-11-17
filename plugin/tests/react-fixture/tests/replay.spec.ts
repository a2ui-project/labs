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

import {expect, test, type Page} from '@playwright/test';

import {record, replay, type Fixture} from './replay';

const fixturePath = (name: string) => path.join(path.dirname(test.info().file), 'fixtures', name);
const read = (name: string): Fixture => JSON.parse(fs.readFileSync(fixturePath(name), 'utf8'));
const errorEntries = (page: Page) => page.locator('li[data-kind="error"]');

async function ask(page: Page, text: string): Promise<void> {
  await page.getByRole('textbox', {name: 'Message'}).fill(text);
  await page.getByRole('button', {name: 'Send'}).click();
}

// An error entry also ends the wait, so that no error turn uses a request.
const turnEnd = (page: Page) =>
  page
    .getByRole('button', {name: 'Send', disabled: false})
    .or(errorEntries(page))
    .first()
    .waitFor({timeout: 300_000});

test('a recording of a replayed run equals the fixture that it replays', async ({page}) => {
  const recording = read('recorded-turn.json');
  await replay(page, recording.responses);
  const recorder = record(page);
  await page.goto('/');
  await ask(page, recording.request);
  const surface = page.locator('li[data-surface-id="newsletter-signup"]');
  await surface
    .locator('a2ui-basic-textfield')
    .filter({hasText: 'Email address'})
    .getByRole('textbox')
    .fill('ada@example.com');
  await surface.getByRole('button', {name: 'Subscribe'}).click();
  await expect(page.getByText("You're subscribed!")).toBeVisible();

  expect(await recorder.fixture(recording.request)).toEqual(recording);
});

test('a live recording replays: the tool call, then the answer with a surface', async ({page}) => {
  const recording = read('live.json');
  const requests = await replay(page, recording.responses);
  await page.goto('/');
  await ask(page, recording.request);

  await expect(page.locator('li[data-kind="surface"]')).toHaveCount(1);
  await turnEnd(page);
  await expect(errorEntries(page)).toHaveCount(0);
  expect(requests).toHaveLength(recording.responses.length);
  expect(requests[1].contents.at(-1)!.parts[0].functionResponse).toEqual({
    name: 'listNewsletters',
    response: {result: [{name: 'Weekly digest'}]},
  });
});
