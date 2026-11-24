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

import type {Page} from '@playwright/test';

const isModel = (url: string) => new URL(url).hostname === 'generativelanguage.googleapis.com';
// One event of a streamed model response, as the endpoint sends it in a "data:" line.
export type ModelEvent = Record<string, unknown>;
// A fixture holds each response of the model endpoint as the list of its events, in order.
export interface Fixture {
  request: string;
  responses: ModelEvent[][];
}

const event = (part: object): ModelEvent => ({
  candidates: [{content: {role: 'model', parts: [part]}}],
});
export const textResponse = (chunks: string[]): ModelEvent[] => chunks.map(text => event({text}));
export const toolCallResponse = (name: string, args: object = {}): ModelEvent[] => [
  event({functionCall: {name, args}}),
];

interface ModelPart {
  text?: string;
  functionResponse?: {name: string; response: {result: unknown}};
}

export interface ModelRequest {
  systemInstruction: {parts: ModelPart[]};
  contents: {role: string; parts: ModelPart[]}[];
}

export const lastText = (request: ModelRequest) => request.contents.at(-1)!.parts[0].text!;
export const toolResult = (request: ModelRequest) =>
  request.contents.at(-1)!.parts[0].functionResponse!;

// Answers request N of the page to the model endpoint with responses[N], so no request leaves the machine.
// The answer to request N waits for hold(N), so that a test can act while that request runs.
export async function replay(
  page: Page,
  responses: ModelEvent[][],
  hold?: (request: number) => Promise<void>,
): Promise<ModelRequest[]> {
  const requests: ModelRequest[] = [];
  await page.addInitScript(() => localStorage.setItem('a2ui-gemini-key', 'replay-no-key'));
  await page.route(
    url => isModel(url.href),
    async route => {
      const response = responses[requests.length];
      requests.push(route.request().postDataJSON());
      await hold?.(requests.length);
      if (response === undefined) {
        await route.fulfill({
          status: 400,
          body: `No recorded response for request ${requests.length}.`,
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          headers: {'access-control-allow-origin': '*'},
          body: response.map(e => `data: ${JSON.stringify(e)}\n\n`).join(''),
        });
      }
    },
  );
  return requests;
}

// Keeps the events of each model response of the page, in order. A response that is not 200 is a failed attempt of the client, and has no place in a fixture.
export function record(
  page: Page,
  log: (line: string) => void = () => {},
): {fixture(request: string): Promise<Fixture>} {
  const bodies: Promise<string>[] = [];
  const start = Date.now();
  const at = () => `at ${(Date.now() - start) / 1000} s`;
  page.on('response', response => {
    if (!isModel(response.url()) || response.request().method() !== 'POST') return;
    // The line never holds the URL or a header, so it cannot hold the key.
    log(`model request: HTTP ${response.status()} ${at()}`);
    if (response.status() === 200) bodies.push(response.text());
  });
  page.on(
    'requestfailed',
    request => isModel(request.url()) && log(`model request: failed ${at()}`),
  );
  const events = (body: string): ModelEvent[] =>
    body
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => JSON.parse(line.slice(5)));
  return {
    fixture: async request => ({request, responses: (await Promise.all(bodies)).map(events)}),
  };
}
