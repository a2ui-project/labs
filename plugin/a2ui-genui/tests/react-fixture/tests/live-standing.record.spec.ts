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

import {expect, test, type Locator, type Page} from '@playwright/test';

import {homeRequest, sidebarRequest} from '../src/instructions';
import {record} from './replay';

// The record run calls the model, so it runs only with the key. The checker removes *_KEY variables.
test.skip(!process.env.A2UI_RECORD_KEY, 'A2UI_RECORD_KEY is not set.');
// A trace keeps the request headers, and with them the key.
test.use({trace: 'off', screenshot: 'off', video: 'off'});
test.setTimeout(600_000);

// At most 3 model requests leave the machine in each test; later ones are aborted.
async function start(page: Page): Promise<ReturnType<typeof record>> {
  let sent = 0;
  await page.route(
    url => url.hostname === 'generativelanguage.googleapis.com',
    route => (++sent > 3 ? route.abort() : route.continue()),
  );
  await page.addInitScript(
    key => localStorage.setItem('a2ui-gemini-key', key),
    process.env.A2UI_RECORD_KEY!,
  );
  return record(page, console.log);
}

async function settled(slot: Locator, placeholder: string): Promise<string> {
  await expect(slot.getByText(placeholder)).toHaveCount(0, {timeout: 300_000});
  await expect(slot).toHaveAttribute('aria-busy', 'false', {timeout: 300_000});
  expect(await slot.getByRole('alert').allTextContents()).toEqual([]);
  return slot.innerText();
}

const save = (name: string, fixture: object) =>
  fs.writeFileSync(
    path.join(path.dirname(test.info().file), 'fixtures', name),
    JSON.stringify(fixture, null, 1) + '\n',
  );

test('records the sidebar surface from a live model, then writes host data', async ({page}) => {
  const recorder = await start(page);
  await page.goto('/#list');
  await page.getByRole('checkbox', {name: 'Alpha'}).check();
  await page.getByRole('button', {name: 'Assistant'}).click();
  const panel = page.getByRole('complementary', {name: 'Assistant panel'});
  const before = await settled(panel, 'The assistant is getting ready.');
  save('live-sidebar.json', await recorder.fixture(sidebarRequest('some', 'sidebar-1')));
  await page.getByRole('checkbox', {name: 'Beta'}).check();
  await page.waitForTimeout(500);
  const after = await panel.innerText();
  console.log(JSON.stringify({before, after}));
});

test('records the home surface from a live model, then writes host data', async ({page}) => {
  const recorder = await start(page);
  await page.goto('/#home');
  const region = page.getByRole('region', {name: 'Today'});
  const before = await settled(region, 'Welcome back.');
  save(
    'live-home.json',
    await recorder.fixture(homeRequest(new Date().toISOString().slice(0, 10), 'home-1')),
  );
  await page.getByRole('link', {name: 'List'}).click();
  await page.getByRole('checkbox', {name: 'Alpha'}).check();
  await page.getByRole('link', {name: 'Home'}).click();
  await page.waitForTimeout(500);
  const after = await region.innerText();
  console.log(JSON.stringify({before, after}));
});
