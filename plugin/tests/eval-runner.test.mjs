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

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {markdown, metrics} from '../evals/report.mjs';
import {agents, trialPrompt} from '../evals/run-trial.mjs';

const trial = (agent, c, started, pass) => ({
  agent,
  case: c,
  started,
  pass,
  minutes: 20,
  agent_version: 'v',
  model: 'm',
  conditions: [{id: 'flows_pass_three_runs', exit: pass ? 0 : 1}],
});

test('pass@1 counts each trial, and pass^3 needs the first three trials to pass', () => {
  const rows = metrics([
    trial('codex', 'compass', '3', false),
    trial('codex', 'compass', '1', true),
    trial('codex', 'compass', '2', true),
    trial('codex', 'actual-budget', '1', true),
    trial('claude', 'compass', '1', true),
    trial('claude', 'compass', '2', true),
    trial('claude', 'compass', '3', true),
    {...trial('claude', 'compass', '0', false), invalid: 'the agent exited with code 1'},
    {...trial('claude', 'compass', '4', false), skill_version: '9.9.9'},
  ]);
  const row = (agent, c) => rows.find(r => r.agent === agent && r.case === c && !r.skill_version);
  assert.equal(row('codex', 'compass').pass_at_1, 2 / 3);
  assert.equal(row('codex', 'compass').pass_3, 0);
  assert.deepEqual(row('codex', 'compass').failed, ['trial 3: flows_pass_three_runs']);
  assert.equal(row('codex', 'actual-budget').pass_3, null);
  assert.equal(row('claude', 'compass').pass_3, 1);
  assert.match(markdown(rows), /pass\^3 of claude: 1 of 1 cases\./);
  assert.equal(rows.find(r => r.skill_version === '9.9.9').trials, 1);
});

test('the trial prompt holds the case prompt and each standing answer, and no agent command holds the key', () => {
  const testCase = JSON.parse(
    fs.readFileSync(new URL('../evals/compass.json', import.meta.url), 'utf8'),
  );
  const prompt = trialPrompt(testCase);
  assert.ok(prompt.startsWith(testCase.prompt));
  for (const {answer} of testCase.standing_answers) assert.ok(prompt.includes(answer));
  process.env.GEMINI_API_KEY = 'test-key-value';
  for (const agent of Object.values(agents)) {
    const [, args] = agent.command(prompt, '/out');
    assert.ok(!args.join(' ').includes('test-key-value'));
  }
});
