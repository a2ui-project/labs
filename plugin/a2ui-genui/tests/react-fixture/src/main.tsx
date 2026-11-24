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

import {lazy, Suspense, useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';

import {newsletters, subscribers} from './data';
import {Settings} from './settings';

// The SDKs and the session load with the assistant, after the first screen.
const Assistant = lazy(() => import('./lazy-assistant'));
const Home = lazy(() => import('./standing').then(m => ({default: m.Home})));
const ListScreen = lazy(() => import('./standing').then(m => ({default: m.ListScreen})));

const hash = {
  subscribe(listener: () => void): () => void {
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  },
  get: () => location.hash,
};

function Subscribers() {
  const emails = useSyncExternalStore(subscribers.subscribe, subscribers.get);
  return (
    <ul aria-label="Subscribers">
      {emails.map((email, i) => (
        <li key={i}>{email}</li>
      ))}
    </ul>
  );
}

function App() {
  const screen = useSyncExternalStore(hash.subscribe, hash.get);
  return (
    <>
      <nav aria-label="Screens">
        <a href="#home">Home</a> <a href="#list">List</a> <a href="#">Chat</a>{' '}
        <a href="#settings">Settings</a>
      </nav>
      {screen === '#home' ? (
        <Suspense>
          <Home />
        </Suspense>
      ) : screen === '#settings' ? (
        <Settings />
      ) : screen === '#list' ? (
        <Suspense>
          <ListScreen />
        </Suspense>
      ) : (
        <Chat />
      )}
    </>
  );
}

const Chat = () => (
  <>
    <ul aria-label="Newsletters">
      {newsletters().map(n => (
        <li key={n.id}>{n.name}</li>
      ))}
    </ul>
    <Subscribers />
    <Suspense>
      <Assistant />
    </Suspense>
  </>
);

createRoot(document.getElementById('root')!).render(<App />);
