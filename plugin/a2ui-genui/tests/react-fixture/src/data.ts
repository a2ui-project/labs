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

export interface Newsletter {
  id: string;
  name: string;
  issues: number;
}

export const newsletters = (): Newsletter[] => [{id: 'n-1', name: 'Weekly digest', issues: 12}];

const subscribed: string[] = [];
const listeners = new Set<() => void>();
let snapshot: readonly string[] = [];

export const subscribers = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: (): readonly string[] => snapshot,
  add(email: string): void {
    subscribed.push(email);
    snapshot = [...subscribed];
    for (const listener of listeners) listener();
  },
};

function store<V>(value: V) {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: (): V => value,
    set(next: V): void {
      value = next;
      for (const listener of listeners) listener();
    },
  };
}

export const items = ['Alpha', 'Beta', 'Gamma'];
export const selection = store<readonly string[]>([]);
export const pins = store(0);
