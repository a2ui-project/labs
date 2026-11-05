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

// @ts-strict-ignore
import {getClock, merkle, serializeClock, Timestamp} from '@actual-app/crdt';

import * as db from '#server/db';

export function rebuildMerkleHash(): {
  numMessages: number;
  trie: merkle.TrieNode;
} {
  const rows: {timestamp: string}[] = db.runQuery('SELECT timestamp FROM messages_crdt', [], true);
  let trie = merkle.emptyTrie();

  for (let i = 0; i < rows.length; i++) {
    trie = merkle.insert(trie, Timestamp.parse(rows[i].timestamp));
  }

  return {
    numMessages: rows.length,
    trie,
  };
}

export async function repairSync(): Promise<void> {
  const rebuilt = rebuildMerkleHash();
  const clock = getClock();

  // Save it locally
  clock.merkle = rebuilt.trie;

  // Persist it in the db
  db.runQuery(db.cache('INSERT OR REPLACE INTO messages_clock (id, clock) VALUES (1, ?)'), [
    serializeClock(clock),
  ]);
}
