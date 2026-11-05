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

// SharedWorker entry point for multi-tab, multi-budget support.
//
// This is the bundler entry (imported via `?sharedworker`); all coordinator
// logic lives in loot-core. This file simply creates a coordinator with
// console forwarding enabled and wires it to the SharedWorkerGlobalScope.

import {createCoordinator} from '@actual-app/core/platform/client/browser-server/coordinator';

const coordinator = createCoordinator({enableConsoleForwarding: true});
(self as unknown as {onconnect: typeof coordinator.onconnect}).onconnect = coordinator.onconnect;
