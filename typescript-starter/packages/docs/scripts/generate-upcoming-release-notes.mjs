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

// Generates `docs/upcoming-release-notes.md` from the repo-root
// `upcoming-release-notes/` directory. These per-PR notes are the changes that
// have been merged but not yet published in a stable release — i.e. what ships
// in the nightly builds. The page is regenerated on every docs build, so
// it always reflects the current set of unreleased changes.
//
// This runs before `docusaurus start` / `docusaurus build` (see package.json).

import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatNotes,
  parseReleaseNotes,
} from '@actual-app/ci-actions/src/release-notes/util.mjs';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

const notesDir = join(repoRoot, 'upcoming-release-notes');
const outputPath = join(
  repoRoot,
  'packages/docs/docs/upcoming-release-notes.md',
);

const intro = `:::info

These changes have been merged but are **not yet part of a stable release**. They
ship in the nightly builds — try them via the \`nightly\` Docker image tag, or the
hosted demo at [nightly.actualbudget.org](https://nightly.actualbudget.org).
For changes in stable releases, see the [Release Notes](./releases.md).

:::`;

const header = `---
title: Upcoming Release
description: Release notes for changes that are merged but not yet released, available in the nightly builds.
sidebar_label: Upcoming Release
---

<!-- This page is auto-generated from the upcoming-release-notes/ directory. Do not edit it by hand. -->

# Upcoming Release

${intro}`;

const { notesByCategory, files } = await parseReleaseNotes(
  notesDir,
  'actualbudget',
  'actual',
);

const body =
  files.length === 0
    ? `There are no unreleased changes right now — everything has shipped in a stable [release](./releases.md).`
    : formatNotes(notesByCategory);

await fs.writeFile(outputPath, `${header}\n\n${body}\n`);

console.log(
  `Generated ${outputPath} from ${files.length} upcoming release note(s).`,
);
