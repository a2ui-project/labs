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

import {A2uiSurface} from '@a2ui/react';
import {useEffect, useState, useSyncExternalStore, type ReactNode} from 'react';

import {session} from './app-session';
import {items, pins, selection} from './data';
import {homeRequest, sidebarRequest} from './instructions';
import {KeyLink, storedKey} from './settings';

function Standing(props: {
  name: string;
  label: string;
  as: 'aside' | 'section';
  children: ReactNode;
}) {
  const slot = useSyncExternalStore(session.subscribe, () => session.slot(props.name));
  const As = props.as;
  return (
    <As aria-label={props.label} aria-busy={slot.busy}>
      {slot.surface ? <A2uiSurface key={slot.surface.id} surface={slot.surface} /> : props.children}
      {!storedKey() && <KeyLink />}
      {slot.error && (
        <p role="alert">
          {slot.error} <button onClick={() => session.retry(props.name)}>Retry</button>
        </p>
      )}
    </As>
  );
}

const date = () => new Date().toISOString().slice(0, 10);

export function Home() {
  const count = useSyncExternalStore(selection.subscribe, selection.get).length;
  // The date is read each time the region shows, and when the tab shows again, so a new date starts one generation.
  const [today, setToday] = useState(date);
  useEffect(() => {
    const seen = () => setToday(date());
    document.addEventListener('visibilitychange', seen);
    return () => document.removeEventListener('visibilitychange', seen);
  }, []);
  useEffect(() => {
    session.setData('home', '/today', today);
    session.setData('home', '/selected_count', count);
    if (storedKey()) session.show('home', today, id => homeRequest(today, id));
  }, [count, today]);
  return (
    <Standing name="home" label="Today" as="section">
      <p>Welcome back. {count} selected.</p>
    </Standing>
  );
}

function Sidebar({count}: {count: number}) {
  const shape = count ? 'some' : 'none';
  useEffect(() => {
    session.setData('sidebar', '/context/selected_count', count);
    if (storedKey()) session.show('sidebar', `list:${shape}`, id => sidebarRequest(shape, id));
  }, [count, shape]);
  return (
    <Standing name="sidebar" label="Assistant panel" as="aside">
      <p>The assistant is getting ready.</p>
    </Standing>
  );
}

export function ListScreen() {
  const selected = useSyncExternalStore(selection.subscribe, selection.get);
  const pinCount = useSyncExternalStore(pins.subscribe, pins.get);
  const [open, setOpen] = useState(false);
  return (
    <main>
      <ul aria-label="Items">
        {items.map(item => (
          <li key={item}>
            <label>
              <input
                type="checkbox"
                checked={selected.includes(item)}
                onChange={event =>
                  selection.set(
                    event.target.checked ? [...selected, item] : selected.filter(i => i !== item),
                  )
                }
              />
              {item}
            </label>
          </li>
        ))}
      </ul>
      <p>Pins: {pinCount}</p>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        Assistant
      </button>
      {open && <Sidebar count={selected.length} />}
    </main>
  );
}
