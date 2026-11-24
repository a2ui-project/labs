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
import {basicCatalog} from '@a2ui/web_core/v1_0';

import {ChatSession, type ChatClient} from '../src/a2ui/session';
import {replay, type Fixture, type ModelRequest} from './replay';

const recording = (): Fixture =>
  JSON.parse(
    fs.readFileSync(
      path.join(path.dirname(test.info().file), 'fixtures', 'recorded-turn.json'),
      'utf8',
    ),
  );

async function press(page: Page, email: string): Promise<ModelRequest[]> {
  const requests = await replay(page, recording().responses);
  await page.goto('/');
  await page.getByRole('textbox', {name: 'Message'}).fill(recording().request);
  await page.getByRole('button', {name: 'Send'}).click();
  const surface = page.locator('li[data-surface-id="newsletter-signup"]');
  await surface
    .locator('a2ui-basic-textfield')
    .filter({hasText: 'Email address'})
    .getByRole('textbox')
    .fill(email);
  await surface.getByRole('button', {name: 'Subscribe'}).click();
  return requests;
}

test('one press runs the host action handler once, then the model turn', async ({page}) => {
  const requests = await press(page, 'ada@example.com');

  await expect(page.getByText("You're subscribed!")).toBeVisible();
  await expect(page.getByRole('list', {name: 'Subscribers'}).getByRole('listitem')).toHaveText([
    'ada@example.com',
  ]);
  expect(requests).toHaveLength(3);
});

test('a failed write shows as an error and does not go to the model', async ({page}) => {
  const requests = await press(page, 'fail@example.com');

  await expect(page.locator('li[data-kind="error"]')).toHaveText([
    'The action failed: Error: The write failed.',
  ]);
  await expect(page.getByRole('list', {name: 'Subscribers'}).getByRole('listitem')).toHaveCount(0);
  expect(requests).toHaveLength(2);
});

test('a reply that sends nothing ends as an error, and the session is no longer busy', async () => {
  const held: ChatClient = {
    async *generate() {
      await new Promise(() => {});
    },
  };
  const session = new ChatSession({
    client: held,
    instructions: '',
    catalogs: [basicCatalog],
    replyTimeoutMs: 50,
  });
  await session.send('Hello');

  expect(session.busy).toBe(false);
  expect(session.entries.map(entry => [entry.kind, entry.text])).toEqual([
    ['user', 'Hello'],
    ['error', 'The request failed: Error: The model sent nothing for 0.05 s.'],
  ]);
});
