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

import {appInstructions} from '../src/instructions';
import {turnInstructions} from '../src/a2ui/session';
import {lastText, replay, textResponse, toolResult, type Fixture, type ModelEvent} from './replay';

// test.info() works whether or not the app's package.json has "type": "module"; import.meta.dirname does not.
const readRecording = (): Fixture =>
  JSON.parse(
    fs.readFileSync(
      path.join(path.dirname(test.info().file), 'fixtures', 'recorded-turn.json'),
      'utf8',
    ),
  );

async function open(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(`page error: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console error: ${message.text()}`);
  });
  await page.goto('/');
  await expect(page.getByRole('textbox', {name: 'Message'})).toBeVisible();
  return errors;
}

async function ask(page: Page, text: string): Promise<void> {
  await page.getByRole('textbox', {name: 'Message'}).fill(text);
  await page.getByRole('button', {name: 'Send'}).click();
}

const entries = (page: Page) =>
  page.getByRole('list', {name: 'Conversation'}).getByRole('listitem');
const errorEntries = (page: Page) => page.locator('li[data-kind="error"]');
// The basic TextField does not tie its label to its input, so the input has no accessible name.
const textField = (scope: Locator, label: string) =>
  scope.locator('a2ui-basic-textfield').filter({hasText: label}).getByRole('textbox');
// A TextField with variant "number" renders a spinbutton, not a textbox.
const numberField = (scope: Locator, label: string) =>
  scope.locator('a2ui-basic-textfield').filter({hasText: label}).getByRole('spinbutton');
// An app component can show the same text as a basic Text, so match only the basic Text, and exactly.
const basicText = (scope: Locator, text: string) =>
  scope.locator('a2ui-basic-text').getByText(text, {exact: true});
// The basic ChoicePicker renders one radio for each option, named by its label: scope.getByRole('radio', {name}).

test('shows a surface with an app component beside basic components', async ({page}) => {
  const recording = readRecording();
  const requests = await replay(page, recording.responses);
  const errors = await open(page);
  await ask(page, recording.request);

  await expect(page.getByText('Here is a sign-up form for the newsletter.')).toBeVisible();
  const surface = page.locator('li[data-surface-id="newsletter-signup"]');
  await expect(basicText(surface, 'Subscribe to our newsletter')).toBeVisible();
  // The replay ran the read tool. Its result is in the second request, and the surface is asserted against it.
  expect(toolResult(requests[1]).name).toBe('listNewsletters');
  const [newsletter] = toolResult(requests[1]).response.result as {name: string}[];
  await expect(surface.getByTestId('status-badge')).toHaveText(`info: ${newsletter.name}`);
  await expect(textField(surface, 'Email address')).toBeVisible();
  const systemPrompt = requests[0].systemInstruction.parts[0].text!;
  expect(systemPrompt.startsWith(appInstructions)).toBe(true);
  expect(systemPrompt).toContain(turnInstructions);
  expect(systemPrompt).toContain('StatusBadge(');
  await expect(errorEntries(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('sends the action and shows the surface the recorded reply leaves', async ({page}) => {
  const recording = readRecording();
  const requests = await replay(page, recording.responses);
  const errors = await open(page);
  await ask(page, recording.request);
  const surface = page.locator('li[data-surface-id="newsletter-signup"]');
  await textField(surface, 'Email address').fill('ada@example.com');
  await surface.getByRole('button', {name: 'Subscribe'}).click();

  await expect(page.getByText('Sent: action subscribe')).toBeVisible();
  await expect(basicText(surface, "You're subscribed!")).toBeVisible();
  await expect(surface.getByTestId('status-badge')).toHaveText('success: ada@example.com');
  await expect(basicText(surface, 'Subscribe to our newsletter')).toHaveCount(0);

  // Each recorded response was used, in order: the tool call, the first answer, the answer to the action.
  expect(requests).toHaveLength(recording.responses.length);
  expect(requests[2].contents.map(content => content.role)).toEqual(['user', 'model', 'user']);
  // One press gives one write.
  await expect(page.getByRole('list', {name: 'Subscribers'}).getByRole('listitem')).toHaveText([
    'ada@example.com',
  ]);
  expect(JSON.parse(lastText(requests[2]))).toEqual({
    a2ui: {
      messages: [
        {
          version: '1.0',
          action: {
            name: 'subscribe',
            surfaceId: 'newsletter-signup',
            sourceComponentId: 'subscribeBtn',
            timestamp: expect.any(String),
            context: {email: 'ada@example.com'},
          },
        },
      ],
    },
    metadata: {
      a2uiRendererDataModel: {
        version: '1.0',
        surfaces: {'newsletter-signup': {email: 'ada@example.com'}},
      },
    },
  });
  await expect(errorEntries(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the read tool returns the data that the app shows', async ({page}) => {
  const recording = readRecording();
  const requests = await replay(page, recording.responses);
  const errors = await open(page);
  await ask(page, recording.request);
  await expect(page.locator('li[data-kind="surface"]')).toHaveCount(1);
  // Read the data on the app's own screen that shows it.
  const shown = await page
    .getByRole('list', {name: 'Newsletters'})
    .getByRole('listitem')
    .allTextContents();
  const result = toolResult(requests[1]).response.result as {name: string}[];
  expect(result.map(newsletter => newsletter.name)).toEqual(shown);
  expect(errors).toEqual([]);
});

test('gives a second answer that names no surface its own surface', async ({page}) => {
  const requests = await replay(page, [
    textResponse(['One.\n<a2ui>\nroot = Card(Text("First answer"))\n</a2ui>']),
    textResponse(['Two.\n<a2ui>\nroot = Card(Text("Second answer"))\n</a2ui>']),
  ]);
  const errors = await open(page);
  await ask(page, 'First');
  await expect(page.getByText('First answer')).toBeVisible();
  await ask(page, 'Second');

  await expect(page.getByText('Second answer')).toBeVisible();
  await expect(page.getByText('First answer')).toBeVisible();
  await expect(page.locator('li[data-kind="surface"]')).toHaveCount(2);
  await expect(page.locator('li[data-surface-id="reply-1"]')).toHaveText('First answer');
  await expect(page.locator('li[data-surface-id="reply-2"]')).toHaveText('Second answer');
  expect(requests[1].contents.map(content => content.parts[0].text)).toEqual([
    'First',
    'One.\n<a2ui>\nroot = Card(Text("First answer"))\n</a2ui>',
    'Second',
  ]);
  await expect(errorEntries(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('shows a rejected block as an error between the text and blocks around it', async ({page}) => {
  const responses: ModelEvent[][] = [
    textResponse([
      'Before.\n<a2ui>\nsurface("bad")\nroot = Card(Nope("x"))\n</a2ui>\n',
      'After.\n<a2ui>\nsurface("good")\nroot = Text("Later block")\n</a2ui>',
    ]),
    textResponse(['Fixed.\n<a2ui>\nsurface("bad")\nroot = Card(Text("Corrected"))\n</a2ui>']),
  ];
  const requests = await replay(page, responses);
  const errors = await open(page);
  await ask(page, 'Show two cards');

  await expect(page.getByText('Later block')).toBeVisible();
  await expect(page.getByText('Corrected')).toBeVisible();
  await expect(entries(page)).toHaveText([
    'Show two cards',
    'Before.',
    `COMPILATION_ERROR on "": Function 'Nope' is not defined in the catalog. - Help: Please correct the syntax error in your Express DSL.`,
    'After.',
    'Later block',
    'Sent: error COMPILATION_ERROR',
    'Fixed.',
    'Corrected',
  ]);
  expect(JSON.parse(lastText(requests[1]))).toEqual({
    a2ui: {
      messages: [
        {
          version: '1.0',
          error: {
            code: 'COMPILATION_ERROR',
            surfaceId: '',
            message:
              "Function 'Nope' is not defined in the catalog. - Help: Please correct the syntax error in your Express DSL.",
          },
        },
      ],
    },
  });
  await expect(errorEntries(page)).toHaveCount(1);
  expect(errors).toEqual([]);
});
