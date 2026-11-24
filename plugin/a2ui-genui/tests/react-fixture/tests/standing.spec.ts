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
import {basicCatalog} from '@a2ui/web_core/v1_0';

import {GenerationSession, type ChatClient} from '../src/a2ui/session';
import {homeRequest} from '../src/instructions';
import {lastText, replay, textResponse, type Fixture} from './replay';

const read = (name: string): Fixture =>
  JSON.parse(fs.readFileSync(path.join(path.dirname(test.info().file), 'fixtures', name), 'utf8'));

async function open(page: Page, hash: string): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(`page error: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console error: ${message.text()}`);
  });
  await page.goto(`/${hash}`);
  return errors;
}

const panel = (page: Page) => page.getByRole('complementary', {name: 'Assistant panel'});
const home = (page: Page) => page.getByRole('region', {name: 'Today'});
const item = (page: Page, name: string) => page.getByRole('checkbox', {name});
const toggle = (page: Page) => page.getByRole('button', {name: 'Assistant'});
const text = (scope: Page | Locator, value: string) =>
  scope.locator('a2ui-basic-text').getByText(value, {exact: true});

test('sidebar: one request on first show, none on a remount, and the turn is the host-built context', async ({
  page,
}) => {
  const fixture = read('sidebar.json');
  const requests = await replay(page, [fixture.responses[0]]);
  const errors = await open(page, '#list');
  await item(page, 'Alpha').check();
  await toggle(page).click();
  await expect(text(panel(page), 'Selected items')).toBeVisible();
  await expect(panel(page)).toHaveAttribute('aria-busy', 'false');

  await toggle(page).click();
  await expect(panel(page)).toHaveCount(0);
  await toggle(page).click();
  await expect(text(panel(page), 'Selected items')).toBeVisible();
  await expect(panel(page)).toHaveAttribute('aria-busy', 'false');
  expect(requests).toHaveLength(1);
  expect(requests[0].contents).toHaveLength(1);
  expect(lastText(requests[0])).toBe(fixture.request);
  expect(errors).toEqual([]);
});

test('sidebar: a selection change inside the context key reaches the surface as data', async ({
  page,
}) => {
  const requests = await replay(page, [read('sidebar.json').responses[0]]);
  const errors = await open(page, '#list');
  await item(page, 'Alpha').check();
  await toggle(page).click();
  await expect(text(panel(page), '1')).toBeVisible();
  await item(page, 'Beta').check();
  await expect(text(panel(page), '2')).toBeVisible();
  await expect(text(panel(page), 'Selected items')).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('sidebar: a new context key gives one request, and the new surface replaces the old', async ({
  page,
}) => {
  const fixture = read('sidebar.json');
  const requests = await replay(page, fixture.responses.slice(0, 2));
  const errors = await open(page, '#list');
  await item(page, 'Alpha').check();
  await toggle(page).click();
  await expect(text(panel(page), 'Selected items')).toBeVisible();
  await item(page, 'Alpha').uncheck();

  await expect(text(panel(page), 'Select items to see actions')).toBeVisible();
  await expect(panel(page)).toHaveAttribute('aria-busy', 'false');
  await expect(text(page, 'Selected items')).toHaveCount(0);
  await expect(page.locator('a2ui-basic-card')).toHaveCount(0);
  await expect(panel(page).locator('a2ui-card')).toHaveCount(1);
  expect(requests).toHaveLength(2);
  expect(lastText(requests[1])).toContain('Selection: none.');
  expect(lastText(requests[1])).toContain('surface("sidebar-2")');
  expect(requests[1].contents).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('sidebar: a press runs the write handler once, and the answer updates the surface', async ({
  page,
}) => {
  const fixture = read('sidebar.json');
  const requests = await replay(page, [fixture.responses[0], fixture.responses[2]]);
  const errors = await open(page, '#list');
  await item(page, 'Alpha').check();
  await toggle(page).click();
  await panel(page).getByRole('button', {name: 'Pin selection'}).click();

  await expect(text(panel(page), 'Pinned')).toBeVisible();
  await expect(page.getByText('Pins: 1')).toBeVisible();
  expect(requests).toHaveLength(2);
  // The panel's own history: its request, the answer, the action. No conversation turn.
  expect(requests[1].contents.map(c => c.role)).toEqual(['user', 'model', 'user']);

  expect(JSON.parse(lastText(requests[1])).a2ui.messages[0].action).toMatchObject({
    name: 'pin',
    surfaceId: 'sidebar-1',
    context: {count: 1},
  });
  expect(errors).toEqual([]);
});

test('home: one request with the fixed date, none after navigation, and data with no request', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00Z'));
  const fixture = read('home.json');
  const requests = await replay(page, fixture.responses);
  const errors = await open(page, '#home');
  await expect(text(home(page), '2026-11-13')).toBeVisible();
  await expect(text(home(page), '0')).toBeVisible();
  await expect(home(page).getByText('Welcome back.')).toHaveCount(0);

  await page.getByRole('link', {name: 'List'}).click();
  await item(page, 'Alpha').check();
  await page.getByRole('link', {name: 'Home'}).click();
  await expect(text(home(page), '1')).toBeVisible();
  await expect(text(home(page), '2026-11-13')).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(lastText(requests[0])).toBe(fixture.request);
  expect(errors).toEqual([]);
});

test('home: a failed turn shows one retry control and keeps the app content', async ({page}) => {
  // The retry is a new generation, so its answer names the next surface id.
  const requests = await replay(page, [
    [],
    textResponse(['<a2ui>\nsurface("home-2")\nroot = Card(Text($/selected_count))\n</a2ui>']),
  ]);
  const errors = await open(page, '#home');
  await expect(home(page).getByRole('alert')).toHaveText('The model gave no reply. Retry');
  await expect(home(page).getByRole('button', {name: 'Retry'})).toHaveCount(1);
  await expect(home(page).getByText('Welcome back. 0 selected.')).toBeVisible();
  await expect(home(page)).toHaveAttribute('aria-busy', 'false');

  await home(page).getByRole('button', {name: 'Retry'}).click();
  await expect(text(home(page), '0')).toBeVisible();
  await expect(home(page).getByRole('alert')).toHaveCount(0);
  expect(requests).toHaveLength(2);
  expect(lastText(requests[1])).toContain('surface("home-2")');
  expect(errors).toEqual([]);
});

test('live recordings replay: host data wins over the value the model wrote, and later writes show', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00Z'));
  const sidebar = read('live-sidebar.json');
  const homeFixture = read('live-home.json');
  const requests = await replay(page, [...sidebar.responses, ...homeFixture.responses]);
  const errors = await open(page, '#list');
  await item(page, 'Alpha').check();
  await toggle(page).click();
  await expect(text(panel(page), 'Selected: 1')).toBeVisible();
  await item(page, 'Beta').check();
  await expect(text(panel(page), 'Selected: 2')).toBeVisible();
  expect(lastText(requests[0])).toBe(sidebar.request);

  await page.getByRole('link', {name: 'Home'}).click();
  // The recorded block writes $/selected_count = 0; the host's 2 is applied after it.
  await expect(text(home(page), 'Selected Count: 2')).toBeVisible();
  await expect(text(home(page), 'Today: 2026-11-13')).toBeVisible();
  expect(lastText(requests[1])).toBe(homeFixture.request);
  expect(requests).toHaveLength(1 + homeFixture.responses.length);
  expect(errors).toEqual([]);
});

const block = (id: string, text: string) =>
  textResponse([`<a2ui>\nsurface("${id}")\nroot = Card(Text("${text}"))\n</a2ui>`]);

test('home: a surface under another id is removed, and one error turn repeats the id', async ({
  page,
}) => {
  const requests = await replay(page, [block('panel', 'Wrong id'), block('home-1', 'Right id')]);
  const errors = await open(page, '#home');
  await expect(text(home(page), 'Right id')).toBeVisible();
  await expect(home(page)).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByText('Wrong id')).toHaveCount(0);
  expect(requests).toHaveLength(2);
  expect(lastText(requests[0])).toContain('surface("home-1")');
  expect(requests[1].contents.map(c => c.role)).toEqual(['user', 'model', 'user']);
  const sent = JSON.parse(lastText(requests[1])).a2ui.messages;
  expect(sent).toHaveLength(1);
  expect(sent[0].error.surfaceId).toBe('panel');
  expect(sent[0].error.message).toContain('surface("home-1")');
  expect(errors).toEqual([]);
});

test('home: after 2 error turns in a row, the error state shows one retry control', async ({
  page,
}) => {
  const requests = await replay(page, [
    block('x1', 'Wrong 1'),
    block('x2', 'Wrong 2'),
    block('x3', 'Wrong 3'),
    block('home-2', 'Right id'),
  ]);
  const errors = await open(page, '#home');
  await expect(home(page).getByRole('alert')).toContainText('after 2 error turns');
  await expect(home(page).getByRole('button', {name: 'Retry'})).toHaveCount(1);
  await expect(home(page).getByText('Welcome back. 0 selected.')).toBeVisible();
  await expect(home(page)).toHaveAttribute('aria-busy', 'false');
  expect(requests).toHaveLength(3);

  await home(page).getByRole('button', {name: 'Retry'}).click();
  await expect(text(home(page), 'Right id')).toBeVisible();
  await expect(home(page).getByRole('alert')).toHaveCount(0);
  expect(requests).toHaveLength(4);
  expect(requests[3].contents).toHaveLength(1);
  expect(lastText(requests[3])).toContain('surface("home-2")');
  expect(errors).toEqual([]);
});

test('sidebar: a reply for a context key that is no longer current is dropped', async ({page}) => {
  const fixture = read('sidebar.json');
  const release: (() => void)[] = [];
  const held = [0, 1].map(() => new Promise<void>(resolve => release.push(resolve)));
  const requests = await replay(page, fixture.responses.slice(0, 2), n => held[n - 1]);
  const errors = await open(page, '#list');
  await item(page, 'Alpha').check();
  await toggle(page).click();
  await expect.poll(() => requests.length).toBe(1);
  await item(page, 'Alpha').uncheck();
  release[0]();

  // The first answer is read and dropped before the second request goes out.
  await expect.poll(() => requests.length).toBe(2);
  await expect(panel(page).getByText('The assistant is getting ready.')).toBeVisible();
  await expect(panel(page)).toHaveAttribute('aria-busy', 'true');
  await expect(text(page, 'Selected items')).toHaveCount(0);
  release[1]();
  await expect(text(panel(page), 'Select items to see actions')).toBeVisible();
  await expect(panel(page)).toHaveAttribute('aria-busy', 'false');
  await expect(text(page, 'Selected items')).toHaveCount(0);
  await expect(panel(page).locator('a2ui-card')).toHaveCount(1);
  expect(requests).toHaveLength(2);
  expect(lastText(requests[1])).toContain('Selection: none.');
  expect(lastText(requests[1])).toContain('surface("sidebar-2")');
  expect(errors).toEqual([]);
});

test('sidebar: a cut-off answer is removed, and the old surface stays with one retry control', async ({
  page,
}) => {
  const fixture = read('sidebar.json');
  const requests = await replay(page, [
    fixture.responses[0],
    textResponse(['<a2ui>\nsurface("sidebar-2")\nroot = Card(Text("Cut off"))\n']),
  ]);
  const errors = await open(page, '#list');
  await item(page, 'Alpha').check();
  await toggle(page).click();
  await expect(text(panel(page), 'Selected items')).toBeVisible();
  await item(page, 'Alpha').uncheck();

  await expect(panel(page).getByRole('alert')).toHaveText('The answer was cut off. Retry');
  await expect(panel(page).getByRole('button', {name: 'Retry'})).toHaveCount(1);
  await expect(panel(page)).toHaveAttribute('aria-busy', 'false');
  await expect(text(panel(page), 'Selected items')).toBeVisible();
  await expect(text(page, 'Cut off')).toHaveCount(0);
  await expect(panel(page).locator('a2ui-card')).toHaveCount(1);
  // No error turn: a cut-off answer is not the model's mistake to correct.
  expect(requests).toHaveLength(2);
  expect(errors).toEqual([]);
});

test('home: a new date, seen when the region shows again, makes exactly one new request', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00Z'));
  const requests = await replay(page, [
    read('home.json').responses[0],
    textResponse(['<a2ui>\nsurface("home-2")\nroot = Card(Text($/today))\n</a2ui>']),
  ]);
  const errors = await open(page, '#home');
  await expect(text(home(page), '2026-11-13')).toBeVisible();
  await expect(home(page)).toHaveAttribute('aria-busy', 'false');

  await page.clock.setFixedTime(new Date('2026-11-14T12:00:00Z'));
  await page.getByRole('link', {name: 'List'}).click();
  // Until the list shows, a suspended screen keeps the region mounted.
  await expect(item(page, 'Alpha')).toBeVisible();
  await page.getByRole('link', {name: 'Home'}).click();
  await expect(text(home(page), '2026-11-14')).toBeVisible();
  await expect(home(page).locator('a2ui-card')).toHaveCount(1);
  await expect(home(page)).toHaveAttribute('aria-busy', 'false');
  expect(requests).toHaveLength(2);
  expect(requests[1].contents).toHaveLength(1);
  expect(lastText(requests[1])).toBe(homeRequest('2026-11-14', 'home-2'));
  expect(errors).toEqual([]);
});

test('home: a press runs the write handler once, and the follow-up uses the region history', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00Z'));
  const requests = await replay(page, [
    textResponse([
      '<a2ui>\nsurface("home-1")\nroot = Card(col)\ncol = Column([d, b])\nd = Text($/today)\nb = Button(Text("Pin today"), action=Event("pin", {day: $/today}))\n</a2ui>',
    ]),
    textResponse(['<a2ui>\nsurface("home-1", update=true)\nd = Text("Pinned")\n</a2ui>']),
  ]);
  const errors = await open(page, '#home');
  await home(page).getByRole('button', {name: 'Pin today'}).click();
  await expect(text(home(page), 'Pinned')).toBeVisible();
  await expect(home(page)).toHaveAttribute('aria-busy', 'false');
  expect(requests).toHaveLength(2);
  expect(requests[1].contents.map(c => c.role)).toEqual(['user', 'model', 'user']);
  expect(requests[1].contents[0].parts[0].text).toBe(homeRequest('2026-11-13', 'home-1'));
  expect(JSON.parse(lastText(requests[1])).a2ui.messages[0].action).toMatchObject({
    name: 'pin',
    surfaceId: 'home-1',
    context: {day: '2026-11-13'},
  });

  await page.getByRole('link', {name: 'List'}).click();
  await expect(page.getByText('Pins: 1')).toBeVisible();
  expect(errors).toEqual([]);
});

test('no key: each container shows its normal content and one key control, and nothing is sent', async ({
  page,
}) => {
  let sent = 0;
  await page.route(
    url => url.hostname === 'generativelanguage.googleapis.com',
    route => (sent++, route.abort()),
  );
  const errors = await open(page, '#home');
  const keyLink = (scope: Locator) => scope.getByRole('link', {name: 'Add a Gemini key'});
  await expect(home(page).getByText('Welcome back. 0 selected.')).toBeVisible();
  await expect(keyLink(home(page))).toHaveCount(1);
  await expect(home(page)).toHaveAttribute('aria-busy', 'false');

  await page.getByRole('link', {name: 'List'}).click();
  await item(page, 'Alpha').check();
  await toggle(page).click();
  await expect(panel(page).getByText('The assistant is getting ready.')).toBeVisible();
  await expect(keyLink(panel(page))).toHaveCount(1);
  await expect(panel(page)).toHaveAttribute('aria-busy', 'false');

  await page.getByRole('link', {name: 'Chat'}).click();
  const chat = page.getByRole('main');
  await expect(keyLink(chat)).toHaveCount(1);
  await expect(chat.getByRole('button', {name: 'Send'})).toBeDisabled();
  await expect(chat.getByRole('textbox', {name: 'Gemini key'})).toHaveCount(0);
  await keyLink(chat).click();
  await expect(page.getByRole('textbox', {name: 'Gemini key'})).toBeVisible();
  expect(sent).toBe(0);
  expect(errors).toEqual([]);
});

test('standing: a held reply ends in the error state, and the target is no longer busy', async () => {
  const held: ChatClient = {
    async *generate() {
      await new Promise(() => {});
    },
  };
  const session = new GenerationSession({
    client: held,
    instructions: '',
    catalogs: [basicCatalog],
    replyTimeoutMs: 50,
  });
  session.show('home', '2026-11-13', id => homeRequest('2026-11-13', id));
  expect(session.slot('home').busy).toBe(true);
  await expect.poll(() => session.slot('home').busy).toBe(false);
  expect(session.slot('home')).toEqual({
    surface: undefined,
    busy: false,
    error: 'The request failed: Error: The model sent nothing for 0.05 s.',
  });
});

test('sidebar: a queued generation for an old context key never starts', async ({page}) => {
  const fixture = read('sidebar.json');
  let release!: () => void;
  const held = new Promise<void>(resolve => (release = resolve));
  const requests = await replay(
    page,
    [
      fixture.responses[0],
      textResponse(['<a2ui>\nsurface("sidebar-3")\nroot = Card(Text("Third"))\n</a2ui>']),
    ],
    n => (n === 1 ? held : Promise.resolve()),
  );
  const errors = await open(page, '#list');
  await item(page, 'Alpha').check();
  await toggle(page).click();
  await expect.poll(() => requests.length).toBe(1);
  await item(page, 'Alpha').uncheck();
  await item(page, 'Beta').check();
  release();

  await expect(text(panel(page), 'Third')).toBeVisible();
  await expect(panel(page)).toHaveAttribute('aria-busy', 'false');
  expect(requests).toHaveLength(2);
  expect(lastText(requests[1])).toContain('Selection: some.');
  expect(lastText(requests[1])).toContain('surface("sidebar-3")');
  expect(errors).toEqual([]);
});
