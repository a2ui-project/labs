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

import {A2uiSurface, type ReactCatalogComponent} from '@a2ui/react';
import {useState, useSyncExternalStore} from 'react';

import type {ChatSession} from './a2ui/session';
import {KeyLink, storedKey} from './settings';

export function Assistant({session}: {session: ChatSession<ReactCatalogComponent>}) {
  const entries = useSyncExternalStore(session.subscribe, () => session.entries);
  const busy = useSyncExternalStore(session.subscribe, () => session.busy);
  const [text, setText] = useState('');
  const noKey = !storedKey();
  return (
    <main>
      <ol aria-label="Conversation">
        {entries.map((entry, i) => (
          <li key={i} data-kind={entry.kind} data-surface-id={entry.surface?.id}>
            {entry.surface ? (
              <A2uiSurface surface={entry.surface} />
            ) : entry.kind === 'sent' ? (
              `Sent: ${entry.text}`
            ) : (
              entry.text
            )}
          </li>
        ))}
      </ol>
      <form
        onSubmit={event => {
          event.preventDefault();
          if (!text.trim()) return;
          void session.send(text);
          setText('');
        }}
      >
        <input aria-label="Message" value={text} onChange={event => setText(event.target.value)} />
        <button type="submit" disabled={busy || noKey}>
          Send
        </button>
      </form>
      {noKey && <KeyLink />}
    </main>
  );
}
