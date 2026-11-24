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
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {lockedVersions, problems} from '../evals/lock-versions.mjs';

const evals = fileURLToPath(new URL('../evals/', import.meta.url));
const cases = fs
  .readdirSync(evals)
  .filter(f => f.endsWith('.json') && f !== 'blueprint.schema.json');
const REQUIRED = [
  'blueprint_valid',
  'placements_match',
  'flows_pass_three_runs',
  'key_check',
  'sdk_versions_locked',
  'no_hand_built_messages',
];

test('there is one case for each sample app', () => {
  assert.deepEqual(cases.sort(), ['actual-budget.json', 'compass.json']);
});

for (const file of cases) {
  test(`${file} has the required fields`, () => {
    const c = JSON.parse(fs.readFileSync(evals + file, 'utf8'));
    assert.match(c.id, /^[a-z][a-z0-9_]*$/);
    assert.ok(['react', 'flutter'].includes(c.stack), 'stack is react or flutter');
    assert.match(c.app.repository, /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/);
    assert.match(c.app.commit, /^[0-9a-f]{40}$/, 'commit is a full SHA');
    assert.ok(c.app.root && !c.app.root.startsWith('/'), 'app root is relative');
    assert.ok(c.prompt.trim(), 'prompt is set');
    assert.ok(c.standing_answers.length > 0 && c.standing_answers.every(a => a.asks && a.answer));
    assert.equal(c.shell, 'bash');
    assert.deepEqual(
      c.pass_conditions.map(p => p.id),
      REQUIRED,
    );
    const keyCheck = c.pass_conditions.find(p => p.id === 'key_check').command;
    const stackFile = fs.readFileSync(
      new URL(`../skills/a2ui-genui/references/stacks/${c.stack}.md`, import.meta.url),
      'utf8',
    );
    assert.ok(
      stackFile.includes(keyCheck),
      `key_check is not the key check command of ${c.stack}.md`,
    );
    for (const p of c.pass_conditions) {
      const syntax = spawnSync('bash', ['-n', '-c', p.command]);
      assert.equal(syntax.status, 0, `${p.id}: ${syntax.stderr}`);
    }
  });
}

test('lock-versions reads yarn and pub lock files', () => {
  const yarn =
    '"@a2ui/react@npm:0.15.0":\n  version: 0.15.0\n  resolution: "@a2ui/react@npm:0.15.0"\n\n"zod@npm:^3":\n  version: 3.25.76\n  resolution: "zod@npm:3.25.76"\n"zod@npm:^4":\n  version: 4.4.3\n  resolution: "zod@npm:4.4.3"\n';
  const found = lockedVersions('yarn.lock', yarn);
  assert.deepEqual(problems(found, ['@a2ui/react=0.15.0']), []);
  assert.equal(problems(found, ['zod=3.25.76']).length, 1, 'two versions of one package fail');
  assert.equal(problems(found, ['@a2ui/agent=0.1.0']).length, 1, 'a missing package fails');
  const pub =
    'packages:\n  a2ui_core:\n    dependency: transitive\n    description:\n      name: a2ui_core\n    source: hosted\n    version: "0.6.0"\n  a2ui_flutter:\n    dependency: "direct main"\n    source: hosted\n    version: "0.2.0"\n';
  assert.deepEqual(
    problems(lockedVersions('pubspec.lock', pub), ['a2ui_core=0.6.0', 'a2ui_flutter=0.2.0']),
    [],
  );
  assert.equal(problems(lockedVersions('pubspec.lock', pub), ['a2ui_flutter=0.1.0']).length, 1);
});
