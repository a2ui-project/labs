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

import type { IBank } from './banks/bank.interface';
import IntegrationBank from './banks/integration-bank';

// Filename convention: <name>_<bic>.{ts,js} (skips bank.interface,
// integration-bank, and any other helper without an underscore).
const bankModules = import.meta.glob<{ default: IBank }>(
  './banks/*_*.{ts,js}',
  {
    eager: true,
  },
);

export const banks: IBank[] = Object.values(bankModules).map(m => m.default);

export function BankFactory(institutionId: string): IBank {
  return (
    banks.find(b => b.institutionIds.includes(institutionId)) || IntegrationBank
  );
}
