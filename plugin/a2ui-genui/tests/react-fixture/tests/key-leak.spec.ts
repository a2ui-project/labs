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

// Joined at run time, so the spec source that a failure report quotes does not hold the value.
const key = ['a2ui', 'dummy', 'key', '5d1e'].join('-');

test.describe.configure({mode: 'serial'});
test.use({trace: 'off', screenshot: 'off', video: 'off'});

test('a record-style run with the key in storage fails', async ({page}) => {
  test.fail();
  await page.addInitScript(k => window.localStorage.setItem('a2ui-gemini-key', k), key);
  await page.goto('/#settings');
  await expect(page.getByRole('textbox', {name: 'Gemini key'})).toBeVisible();
  await expect(page.getByText('This text never shows')).toBeVisible({timeout: 500});
});

test('the failed run leaves no copy of the key in the output folder', () => {
  const outputDir = test.info().project.outputDir;
  const files = fs
    .readdirSync(outputDir, {recursive: true, encoding: 'utf8'})
    .map(file => path.join(outputDir, file))
    .filter(file => fs.statSync(file).isFile());
  const report = files.find(
    file => file.includes('record-style') && file.endsWith('error-context.md'),
  );
  expect(report, 'the failed run wrote its page snapshot').toBeDefined();
  expect(fs.readFileSync(report!, 'utf8')).toContain('textbox "Gemini key"');
  expect(files.filter(file => fs.readFileSync(file, 'utf8').includes(key))).toEqual([]);
});
