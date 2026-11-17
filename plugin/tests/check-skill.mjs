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

const root = fileURLToPath(new URL('../skills/a2ui-genui/', import.meta.url));
const HEADINGS = [
  'Detect',
  'Install',
  'Catalog',
  'Session',
  'Model client',
  'Mount',
  'Key',
  'Flow test',
  'Traps',
];
const PLACEMENT_HEADINGS = ['Use', 'Request', 'Surface', 'States', 'Test'];
const MAX_TOTAL_LINES = 1600;
const FRONTMATTER_KEYS = ['name', 'description', 'license', 'compatibility', 'metadata'];
const STACK_WORDS = new RegExp(
  '\\b(react|flutter|npm|npx|yarn|pnpm|dart|typescript|javascript|vite|playwright|pub\\.dev|pubspec|node_modules|actual|compass|travel)\\b',
  'i',
);
const ABSOLUTE_PATH =
  /(^|[\s"'(`=:,])(\/(Users|home|private|tmp|var|opt|etc|root|mnt|Volumes)\/|~\/|[A-Za-z]:\\)/;
const problems = [];

function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [path.relative(root, full).split(path.sep).join('/')];
  });
}

function lines(rel) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  return text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
}

const files = walk(root);
const skill = lines('SKILL.md');

const tableStart = skill.findIndex(line => /^\|\s*Found\s*\|\s*Stack\s*\|/.test(line));
let tableEnd = tableStart;
while (tableEnd >= 0 && tableEnd + 1 < skill.length && skill[tableEnd + 1].startsWith('|'))
  tableEnd++;
if (tableStart < 0)
  problems.push('SKILL.md: no detection table. Add the table whose header is "| Found | Stack |".');
const detected = skill
  .slice(tableStart + 2, tableEnd + 1)
  .flatMap(row => row.match(/^\|[^|]*\|\s*`([a-z0-9-]+)`\s*\|/)?.[1] ?? []);

const placementStart = skill.findIndex(line => /^\|\s*Placement\s*\|/.test(line));
let placementEnd = placementStart;
while (
  placementEnd >= 0 &&
  placementEnd + 1 < skill.length &&
  skill[placementEnd + 1].startsWith('|')
)
  placementEnd++;
if (placementStart < 0)
  problems.push('SKILL.md: no placement table. Add the table whose header starts "| Placement |".');
const placements = skill
  .slice(placementStart + 2, placementEnd + 1)
  .flatMap(row => row.match(/^\|\s*`([a-z0-9-]+)`\s*\|/)?.[1] ?? []);

for (const rel of files) {
  const text = lines(rel);
  const limit = rel === 'SKILL.md' ? 300 : 500;
  if (text.length > limit)
    problems.push(
      `${rel}: ${text.length} lines. The limit is ${limit}. Move detail into a reference.`,
    );
  const core = !rel.startsWith('references/stacks/');
  text.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (/[ \t]+$/.test(line)) problems.push(`${at}: trailing whitespace. Remove it.`);
    if (ABSOLUTE_PATH.test(line))
      problems.push(`${at}: absolute path. Use a path relative to the skill or the app root.`);
    const inTable = rel === 'SKILL.md' && i >= tableStart && i <= tableEnd;
    const word = core && !inTable && line.match(STACK_WORDS);
    if (word) problems.push(`${at}: the core names "${word[1]}". Move this fact to a stack file.`);
  });
}

for (const rel of files.filter(
  f => f === 'SKILL.md' || (f.startsWith('references/') && f.endsWith('.md')),
)) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^[a-z]+:|^#/.test(target)) continue;
    if (!fs.existsSync(path.join(root, path.dirname(rel), target.split('#')[0]))) {
      problems.push(`${rel}: the link ${target} does not exist. Fix the link or add the file.`);
    }
  }
  for (const [, target] of text.matchAll(/`(references\/[^`\s<>*{}]*)`/g)) {
    if (!fs.existsSync(path.join(root, target))) {
      problems.push(
        `${rel}: the path ${target} does not exist. Paths in backticks are relative to the skill folder.`,
      );
    }
  }
}

// The skill ships instructions only. Code for an app comes from the installed SDKs, and the checks of a trial are in evals/.
for (const rel of files.filter(f => !/^(SKILL\.md|references\/.*\.md)$/.test(f))) {
  problems.push(`${rel}: the skill holds only SKILL.md and references/*.md. Remove this file.`);
}

const stackFiles = files.filter(f => /^references\/stacks\/[^/]+\.md$/.test(f));
for (const rel of stackFiles) {
  const id = path.basename(rel, '.md');
  const headings = lines(rel).flatMap(line => line.match(/^## (.+)$/)?.[1] ?? []);
  if (JSON.stringify(headings) !== JSON.stringify(HEADINGS)) {
    problems.push(
      `${rel}: its ## headings are "${headings.join(', ')}". They must be, in order: ${HEADINGS.join(', ')}.`,
    );
  }
  if (!lines(rel).some(line => line.startsWith('Sources: ')))
    problems.push(
      `${rel}: no "Sources: " line. Name the guides, READMEs and upstream files it follows.`,
    );
  if (!detected.includes(id))
    problems.push(`${rel}: the detection table of SKILL.md has no row for "${id}". Add one.`);
}
for (const id of detected) {
  if (!stackFiles.includes(`references/stacks/${id}.md`))
    problems.push(
      `SKILL.md: the detection table names "${id}", but references/stacks/${id}.md does not exist.`,
    );
}
for (const rel of stackFiles) {
  const text = lines(rel);
  const start = text.indexOf('## Mount');
  const end = text.findIndex((line, i) => i > start && line.startsWith('## '));
  const mount = start < 0 ? '' : text.slice(start, end < 0 ? undefined : end).join('\n');
  const missing = placements.filter(
    id => !mount.includes(`\`${id}\``) && !mount.includes(`**${id}**`),
  );
  if (missing.length > 0)
    problems.push(
      `${rel}: its Mount heading does not name the placements ${missing.join(', ')}. Add a part for each one.`,
    );
}

const placementFiles = files.filter(f => /^references\/placements\/[^/]+\.md$/.test(f));
for (const rel of placementFiles) {
  const headings = lines(rel).flatMap(line => line.match(/^## (.+)$/)?.[1] ?? []);
  if (JSON.stringify(headings) !== JSON.stringify(PLACEMENT_HEADINGS)) {
    problems.push(
      `${rel}: its ## headings are "${headings.join(', ')}". They must be, in order: ${PLACEMENT_HEADINGS.join(', ')}.`,
    );
  }
  if (!placements.includes(path.basename(rel, '.md')))
    problems.push(
      `${rel}: the placement table of SKILL.md has no row for "${path.basename(rel, '.md')}". Add one.`,
    );
}
for (const id of placements) {
  if (!placementFiles.includes(`references/placements/${id}.md`))
    problems.push(
      `SKILL.md: the placement table names "${id}", but references/placements/${id}.md does not exist.`,
    );
}

const totalLines = files.reduce((sum, rel) => sum + lines(rel).length, 0);
if (totalLines > MAX_TOTAL_LINES)
  problems.push(
    `The skill has ${totalLines} lines. The limit is ${MAX_TOTAL_LINES}. Cut what another file already says.`,
  );

if (skill[0] !== '---' || skill.indexOf('---', 1) < 0) {
  problems.push('SKILL.md: no frontmatter. Start the file with a block between two "---" lines.');
} else {
  const frontmatter = skill.slice(1, skill.indexOf('---', 1));
  for (const line of frontmatter) {
    const key = line.match(/^([^\s:#][^:]*):/)?.[1];
    if (key && !FRONTMATTER_KEYS.includes(key)) {
      problems.push(
        `SKILL.md: frontmatter key "${key}" is not portable. Use only ${FRONTMATTER_KEYS.join(', ')}.`,
      );
    }
  }
  if (!frontmatter.includes(`name: ${path.basename(root)}`))
    problems.push(`SKILL.md: frontmatter name must be ${path.basename(root)}, the folder name.`);
}

if (problems.length > 0) {
  console.error(`check-skill: ${problems.length} problem(s)\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-skill: ${files.length} files OK`);
