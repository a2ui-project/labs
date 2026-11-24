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
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('../evals/check-blueprint.mjs', import.meta.url));

// The test command exits with the codes of codes.json in turn.
const stepScript = `
import fs from 'node:fs';
const codes = JSON.parse(fs.readFileSync('codes.json', 'utf8'));
const n = fs.existsSync('n.txt') ? Number(fs.readFileSync('n.txt', 'utf8')) : 0;
fs.writeFileSync('n.txt', String(n + 1));
fs.appendFileSync('keys.txt', Object.keys(process.env).filter(name => name.endsWith('_KEY')).join(','));
process.exit(codes[n] ?? 0);
`;

function flow(id, overrides = {}) {
  return {
    id,
    kind: 'explore',
    placement: 'inline',
    trigger: {type: 'prompt', text: `Show ${id}`},
    expected_surface: ['Card'],
    test_command: `"${process.execPath}" step.mjs`,
    status: 'success',
    rounds_used: 0,
    ...overrides,
  };
}

function app(codes = [], blueprint = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-blueprint-'));
  const flows = [
    flow('one'),
    flow('two', {
      kind: 'input',
      placement: 'sidebar',
      trigger: {type: 'context', text: 'Open two'},
    }),
    flow('three', {kind: 'act', placement: 'home'}),
  ];
  fs.writeFileSync(path.join(dir, 'step.mjs'), stepScript);
  fs.writeFileSync(path.join(dir, 'codes.json'), JSON.stringify(codes));
  fs.writeFileSync(
    path.join(dir, 'a2ui.blueprint.json'),
    JSON.stringify({stack: 'web', sdk_versions: {'agent-sdk': '0.1.0'}, flows, ...blueprint}),
  );
  return dir;
}

function cli(dir, ...args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: {...process.env, SECRET_KEY: 'secret-value'},
  });
}

test('a valid blueprint passes validation', () => {
  assert.equal(cli(app(), 'validate').status, 0);
});

test('a blueprint with two flows, a used id, a - in an id or an unknown status fails', () => {
  const two = cli(app([], {flows: [flow('one'), flow('two')]}), 'validate');
  assert.equal(two.status, 1);
  assert.match(two.stderr, /flows has 2 items/);
  assert.match(
    cli(app([], {flows: [flow('one'), flow('one'), flow('three')]}), 'validate').stderr,
    /used twice/,
  );
  assert.equal(
    cli(app([], {flows: [flow('one-a'), flow('two'), flow('three')]}), 'validate').status,
    1,
  );
  // The agent can keep its own notes in the blueprint. The harness reads only the fields that it knows.
  assert.equal(
    cli(
      app([], {
        notes: 'x',
        flows: [flow('one', {fixture_source: 'live'}), flow('two'), flow('three')],
      }),
      'validate',
    ).status,
    0,
  );
  assert.equal(
    cli(
      app([], {flows: [flow('one', {status: 'blocked'}), flow('two'), flow('three')]}),
      'validate',
    ).status,
    1,
  );
});

test('a failed flow with a cause is a valid blueprint', () => {
  assert.equal(
    cli(
      app([], {
        flows: [
          flow('one', {status: 'failed', cause: 'The SDK has no date input.', rounds_used: 5}),
          flow('two'),
          flow('three'),
        ],
      }),
      'validate',
    ).status,
    0,
  );
});

test('run passes when each flow passes three runs in a row, and no run gets a variable that ends in _KEY', () => {
  const dir = app();
  const result = cli(dir, 'run');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(fs.readFileSync(path.join(dir, 'n.txt'), 'utf8'), '9');
  assert.equal(fs.readFileSync(path.join(dir, 'keys.txt'), 'utf8'), '');
});

test('run fails when one run of one flow fails, also when the agent wrote success, and still runs the other flows', () => {
  const dir = app([0, 0, 1]);
  const result = cli(dir, 'run');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /one run 3 of 3: exit 1/);
  assert.match(result.stdout, /three run 3 of 3: exit 0/);
});

function withFirst(overrides) {
  return app([], {flows: [flow('one', overrides), flow('two'), flow('three')]});
}

test('a flow with no placement, an unknown placement, an unknown trigger type, an empty trigger text or only a prompt fails', () => {
  const {placement, trigger, ...old} = flow('one', {prompt: 'Show one'});
  for (const [blueprint, error] of [
    [withFirst({placement: undefined}), /has no "placement"/],
    [withFirst({placement: 'modal'}), /placement is "modal"/],
    [withFirst({trigger: {type: 'voice', text: 'x'}}), /trigger\.type is "voice"/],
    [withFirst({trigger: {type: 'prompt', text: ''}}), /trigger\.text is empty/],
    [app([], {flows: [old, flow('two'), flow('three')]}), /has no "trigger"/],
  ]) {
    const result = cli(blueprint, 'validate');
    assert.equal(result.status, 1);
    assert.match(result.stderr, error);
  }
});

test('extra unknown fields in a flow and in its trigger still pass', () => {
  assert.equal(
    cli(
      withFirst({notes: 'x', trigger: {type: 'context', text: 'Open one', screen: 'list'}}),
      'validate',
    ).status,
    0,
  );
});

test('placements passes on one flow of each placement, fails on two inline flows, and needs three known names', () => {
  assert.equal(cli(app(), 'placements', 'inline', 'sidebar', 'home').status, 0);
  const two = cli(
    app([], {flows: [flow('one'), flow('two'), flow('three', {placement: 'home'})]}),
    'placements',
    'inline',
    'sidebar',
    'home',
  );
  assert.equal(two.status, 1);
  assert.match(two.stderr, /They have home, inline, inline/);
  assert.equal(cli(app(), 'placements', 'inline', 'sidebar').status, 2);
  assert.equal(cli(app(), 'placements', 'inline', 'sidebar', 'modal').status, 2);
});
