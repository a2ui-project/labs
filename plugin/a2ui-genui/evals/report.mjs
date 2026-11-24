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
import {fileURLToPath} from 'node:url';

// pass^3 is 1 only when the first three trials of a case all pass. With fewer than three trials it has no value.
export function metrics(results) {
  const groups = new Map();
  for (const r of [...results]
    .filter(r => !r.invalid)
    .sort((a, b) => a.started.localeCompare(b.started))) {
    const key = [r.agent, r.model, r.skill_version, r.case].join('\u0000');
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.values()].map(trials => ({
    agent: trials[0].agent,
    case: trials[0].case,
    agent_version: trials[0].agent_version,
    model: trials[0].model,
    skill_version: trials[0].skill_version,
    trials: trials.length,
    passed: trials.filter(t => t.pass).length,
    pass_at_1: trials.filter(t => t.pass).length / trials.length,
    pass_3: trials.length < 3 ? null : trials.slice(0, 3).every(t => t.pass) ? 1 : 0,
    minutes: trials.map(t => t.minutes),
    failed: trials.flatMap((t, i) =>
      t.conditions.filter(c => c.exit !== 0).map(c => `trial ${i + 1}: ${c.id}`),
    ),
  }));
}

export function markdown(rows) {
  const lines = [
    '| Agent | Model | Skill | Case | Trials | Passed | pass@1 | pass^3 | Minutes | Failed conditions |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map(
      r =>
        `| ${r.agent} (${r.agent_version}) | ${r.model} | ${r.skill_version} | ${r.case} | ${r.trials} | ${r.passed} | ${r.pass_at_1.toFixed(2)} | ${r.pass_3 ?? 'n/a'} | ${r.minutes.join(', ')} | ${r.failed.join('; ') || 'none'} |`,
    ),
  ];
  for (const agent of new Set(rows.map(r => r.agent))) {
    const cases = rows.filter(r => r.agent === agent && r.pass_3 !== null);
    if (cases.length)
      lines.push(
        '',
        `pass^3 of ${agent}: ${cases.filter(r => r.pass_3 === 1).length} of ${cases.length} cases.`,
      );
  }
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2];
  if (!root) {
    console.error('Usage: node report.mjs <dir with one folder per trial>');
    process.exit(2);
  }
  const results = fs
    .readdirSync(root)
    .map(name => path.join(root, name, 'result.json'))
    .filter(file => fs.existsSync(file))
    .map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
  console.log(markdown(metrics(results)));
  for (const r of results.filter(r => r.invalid))
    console.log(`\nNot counted: ${r.agent} on ${r.case}, ${r.minutes} min: ${r.invalid}.`);
}
