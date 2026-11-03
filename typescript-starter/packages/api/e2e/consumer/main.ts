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

// A minimal third-party consumer of @actual-app/api. It does nothing special:
// just `import` the package and `init()`. The only host requirement is COOP/COEP
// headers, which serve-dist.mjs sets. This fixture is bundled for production by
// global-setup.ts, exercising a consumer bundler processing dist/browser.js.
import * as api from '@actual-app/api';

const out = document.getElementById('out');
if (out == null) {
  throw new Error('Missing `#out` element in consumer fixture');
}
function report(state: 'ok' | 'error', detail: unknown) {
  out.textContent = JSON.stringify(detail);
  out.setAttribute('data-state', state);
}

async function run() {
  await api.init({ dataDir: '/documents' });
  await api.runImport('Consumer E2E', async () => {
    await api.createAccount({ name: 'Checking', offbudget: false }, 12345);
  });
  const accounts = await api.getAccounts();
  report('ok', { accounts: accounts.map(a => a.name) });
}

run().catch(err =>
  report('error', err instanceof Error ? err.message : String(err)),
);
