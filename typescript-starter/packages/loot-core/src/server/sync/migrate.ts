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
import { Timestamp } from '@actual-app/crdt';

import { addSyncListener, applyMessages } from './index';
import type { Message } from './index';

function migrateParentIds(_oldValues, newValues) {
  newValues.forEach((items, table) => {
    if (table === 'transactions') {
      const toApply: Message[] = [];

      items.forEach(newValue => {
        if (
          newValue.isChild === 1 &&
          newValue.parent_id == null &&
          newValue.id.includes('/')
        ) {
          const parentId = newValue.id.split('/')[0];

          toApply.push({
            dataset: 'transactions',
            row: newValue.id,
            column: 'parent_id',
            value: parentId,
            timestamp: Timestamp.send(),
          });
        }
      });

      if (toApply.length > 0) {
        void applyMessages(toApply);
      }
    }
  });
}

let _unlisten = null;
export function listen() {
  unlisten();
  _unlisten = addSyncListener(migrateParentIds);
}

export function unlisten() {
  if (_unlisten) {
    _unlisten();
    _unlisten = null;
  }
}
