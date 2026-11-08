/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Pure logic for the migration checks that run in CI. Database migrations
// are append-only: once a migration has shipped, editing or deleting it
// forks the schema across the user base (clients that already ran the old
// version will never re-run it), and a migration dated before an already
// shipped one triggers the `out-of-sync-migrations` error for users who
// applied the newer one first. This module also flags statements that look
// like they remove or rename schema, so contributors get a hint in the PR
// checks.
// See https://actualbudget.org/docs/contributing/project-details/migrations

export type MigrationEntry = {
  name: string;
  id: number;
  hash: string;
};

// Parses `git ls-tree <ref> -- <dir>/` output, where each line looks like
// `100644 blob <hash>\t<path>`.
export function parseMigrationTree(lsTreeOutput: string): MigrationEntry[] {
  return lsTreeOutput
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [meta, filePath] = line.split('\t');
      const hash = meta?.split(/\s+/)[2] ?? '';
      const name = filePath?.split('/').pop() ?? '';
      return {name, id: Number.parseInt(name.split('_')[0], 10), hash};
    })
    .filter(entry => entry.name !== '' && !entry.name.startsWith('.'))
    .filter(entry => Number.isFinite(entry.id));
}

export function findAddedMigrations(
  base: MigrationEntry[],
  head: MigrationEntry[],
): MigrationEntry[] {
  const baseNames = new Set(base.map(migration => migration.name));
  return head.filter(migration => !baseNames.has(migration.name));
}

export function findMutatedMigrations(
  base: MigrationEntry[],
  head: MigrationEntry[],
): {modified: string[]; deleted: string[]} {
  const headByName = new Map(head.map(migration => [migration.name, migration]));

  const modified: string[] = [];
  const deleted: string[] = [];
  for (const migration of base) {
    const headMigration = headByName.get(migration.name);
    if (!headMigration) {
      deleted.push(migration.name);
    } else if (headMigration.hash !== migration.hash) {
      modified.push(migration.name);
    }
  }
  return {modified, deleted};
}

export function findMisdatedMigrations(
  added: MigrationEntry[],
  latestExistingId: number,
): MigrationEntry[] {
  return added.filter(migration => migration.id <= latestExistingId);
}

const RISKY_PATTERNS = [
  {pattern: /\bDROP\s+TABLE\b/i, description: 'drops a table'},
  {pattern: /\bDROP\s+COLUMN\b/i, description: 'drops a column'},
  {
    pattern: /\bRENAME\s+(COLUMN|TO)\b/i,
    description: 'renames a table or column',
  },
];

// Advisory only: regexes over SQL text can't see every destructive change,
// so this just surfaces an early hint on obviously suspicious SQL.
export function findRiskyStatements(source: string): string[] {
  const withoutComments = source.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  return RISKY_PATTERNS.filter(({pattern}) => pattern.test(withoutComments)).map(
    ({description}) => description,
  );
}
