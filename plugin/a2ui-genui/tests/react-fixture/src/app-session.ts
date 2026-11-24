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

import {injectBasicCatalogStyles, type ActionPayload} from '@a2ui/web_core/v1_0';

import {ChatSession} from './a2ui/session';
import {catalogs} from './catalog';
import {pins, subscribers} from './data';
import {GeminiClient} from './gemini-client';
import {appInstructions} from './instructions';
import {storedKey} from './settings';

injectBasicCatalogStyles();
const client = new GeminiClient(storedKey);
// The write fails for one address, so that a test can see a failed write.
const onAction = (action: ActionPayload) => {
  if (action.name === 'pin') return pins.set(pins.get() + 1);
  if (action.name !== 'subscribe') return;
  if (action.context.email === 'fail@example.com') throw new Error('The write failed.');
  subscribers.add(String(action.context.email));
};
// One session for the whole app, outside the React tree, so a remount makes no request.
export const session = new ChatSession({client, instructions: appInstructions, catalogs, onAction});
