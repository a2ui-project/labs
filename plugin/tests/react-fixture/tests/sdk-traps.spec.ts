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

import {expect, test} from '@playwright/test';

import {replay, textResponse} from './replay';

test('@a2ui/agent 0.1.0 drops root = <variable> in an update block, with no error', async ({
  page,
}) => {
  await replay(page, [
    textResponse([
      '<a2ui>\nsurface("c")\nroot = Column([card, btn])\ncard = Card(Text("Old"))\nbtn = Button(t, "primary", Event("go"))\nt = Text("Confirm")\n</a2ui>',
    ]),
    textResponse([
      '<a2ui>\nsurface("c", update=true)\nroot = card\ncard = Card(row)\nrow = Text("New")\n</a2ui>',
    ]),
  ]);
  await page.goto('/');
  for (const text of ['One', 'Two']) {
    await page.getByRole('textbox', {name: 'Message'}).fill(text);
    await page.getByRole('button', {name: 'Send'}).click();
  }
  const surface = page.locator('li[data-surface-id="c"]');
  await expect(surface.getByText('New')).toBeVisible();
  await expect(surface.getByRole('button', {name: 'Confirm'})).toBeVisible();
  await expect(page.locator('li[data-kind="error"]')).toHaveCount(0);
});

test('a basic Card renders as a2ui-card, and a text that an app component also shows needs the basic Text', async ({
  page,
}) => {
  await replay(page, [
    textResponse([
      '<a2ui>\nsurface("c")\nroot = Card(col)\ncol = Column([t, b])\nt = Text("Weekly digest")\nb = StatusBadge("Weekly digest", "info")\n</a2ui>',
    ]),
  ]);
  await page.goto('/');
  await page.getByRole('textbox', {name: 'Message'}).fill('One');
  await page.getByRole('button', {name: 'Send'}).click();
  const surface = page.locator('li[data-surface-id="c"]');
  await expect(surface.locator('a2ui-card')).toHaveCount(1);
  await expect(surface.locator('a2ui-basic-card')).toHaveCount(0);
  await expect(surface.locator('a2ui-react-statusbadge')).toHaveText('info: Weekly digest');
  await expect(surface.getByText('Weekly digest')).toHaveCount(2);
  await expect(
    surface.locator('a2ui-basic-text').getByText('Weekly digest', {exact: true}),
  ).toHaveCount(1);
});
