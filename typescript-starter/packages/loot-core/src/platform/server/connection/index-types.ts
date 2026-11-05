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

import type {Handlers} from '#types/handlers';
import type {ServerEvents} from '#types/server-events';

export declare function init(
  channel: Window | number, // in electron the port number, in web the worker
  handlers: Handlers,
): void;
export type Init = typeof init;

export declare function send<K extends keyof ServerEvents>(type: K, args?: ServerEvents[K]): void;
export type Send = typeof send;

export declare function getNumClients(): number;
export type GetNumClients = typeof getNumClients;

export declare function resetEvents(): void;
export type ResetEvents = typeof resetEvents;
