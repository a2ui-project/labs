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

// @ts-check

/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require('@yarnpkg/types');

/**
 * Enforce that all workspaces use the same version of any shared dependency.
 * Workspace protocol references (workspace:*) and peerDependencies are
 * excluded since they intentionally use different/wider ranges.
 *
 * @param {import('@yarnpkg/types').Yarn.Constraints.Context} context
 */
function enforceConsistentDependencies({ Yarn }) {
  /** @type {Map<string, Map<string, Array<import('@yarnpkg/types').Yarn.Constraints.Workspace>>>} */
  const dependencyVersions = new Map();

  for (const workspace of Yarn.workspaces()) {
    for (const type of ['dependencies', 'devDependencies']) {
      for (const dep of Yarn.dependencies({ workspace, type })) {
        if (dep.range.startsWith('workspace:')) continue;

        if (!dependencyVersions.has(dep.ident)) {
          dependencyVersions.set(dep.ident, new Map());
        }
        const versions = dependencyVersions.get(dep.ident);
        if (!versions.has(dep.range)) {
          versions.set(dep.range, []);
        }
        versions.get(dep.range).push(workspace);
      }
    }
  }

  for (const [ident, versions] of dependencyVersions) {
    if (versions.size <= 1) continue;

    const rangeList = [...versions.keys()].join(', ');

    for (const [, workspaces] of versions) {
      for (const workspace of workspaces) {
        workspace.error(
          `Package "${ident}" has inconsistent versions across workspaces (${rangeList}). ` +
            `All workspaces must use the same version range.`,
        );
      }
    }
  }
}

module.exports = defineConfig({
  async constraints(ctx) {
    enforceConsistentDependencies(ctx);
  },
});
