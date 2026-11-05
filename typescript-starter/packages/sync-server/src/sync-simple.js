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

import {existsSync} from 'node:fs';

import {create, merkle, MessageEnvelopeSchema, Timestamp} from '@actual-app/crdt';

import {openDatabase} from './db';
import messagesSql from './sql/messages.sql?raw';
import {getPathForGroupFile} from './util/paths';

function getGroupDb(groupId) {
  const path = getPathForGroupFile(groupId);
  const needsInit = !existsSync(path);

  const db = openDatabase(path);

  if (needsInit) {
    db.exec(messagesSql);
  }

  return db;
}

function addMessages(db, messages) {
  let returnValue;
  db.transaction(() => {
    let trie = getMerkle(db);

    if (messages.length > 0) {
      for (const msg of messages) {
        const info = db.mutate(
          `INSERT OR IGNORE INTO messages_binary (timestamp, is_encrypted, content)
             VALUES (?, ?, ?)`,
          [msg.timestamp, msg.isEncrypted ? 1 : 0, Buffer.from(msg.content)],
        );

        if (info.changes > 0) {
          trie = merkle.insert(trie, Timestamp.parse(msg.timestamp));
        }
      }
    }

    trie = merkle.prune(trie);

    db.mutate(
      'INSERT INTO messages_merkles (id, merkle) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET merkle = ?',
      [JSON.stringify(trie), JSON.stringify(trie)],
    );

    returnValue = trie;
  });

  return returnValue;
}

function getMerkle(db) {
  const rows = db.all('SELECT * FROM messages_merkles');

  if (rows.length > 0) {
    return JSON.parse(rows[0].merkle);
  } else {
    // No merkle trie exists yet (first sync of the app), so create a
    // default one.
    return {};
  }
}

export function sync(messages, since, groupId) {
  const db = getGroupDb(groupId);
  const newMessages = db.all(
    `SELECT * FROM messages_binary
         WHERE timestamp > ?
         ORDER BY timestamp`,
    [since],
  );

  const trie = addMessages(db, messages);

  db.close();

  return {
    trie,
    newMessages: newMessages.map(msg =>
      create(MessageEnvelopeSchema, {
        timestamp: msg.timestamp,
        isEncrypted: msg.is_encrypted === 1,
        content: msg.content,
      }),
    ),
  };
}
