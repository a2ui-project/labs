/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Copies the Python Express worker and the basic catalog JSON next to the bundled server
// so the installed plugin (plugin/mcp/dist) is self-contained.
import {cpSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const repoRoot = resolve(pkgRoot, '..', '..');
const dist = resolve(pkgRoot, 'dist');

mkdirSync(dist, {recursive: true});
cpSync(resolve(pkgRoot, 'python', 'express_worker.py'), resolve(dist, 'express_worker.py'));
cpSync(resolve(repoRoot, 'catalogs'), resolve(dist, 'catalogs'), {recursive: true});
console.log('[mcp-server] staged express_worker.py and catalogs/ into dist/');
