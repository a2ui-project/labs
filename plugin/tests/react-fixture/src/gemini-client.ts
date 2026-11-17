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

import {GoogleGenAI, type Content, type Part} from '@google/genai';

import type {ChatClient, ChatTurn} from './a2ui/session';
import {readTools} from './tools';

export const modelName = 'gemini-3.6-flash';

export class GeminiClient implements ChatClient {
  constructor(
    private readonly key: () => string,
    // The waits before the second and the third attempt of a request that fails before its first chunk.
    private readonly retryWaitsMs: readonly number[] = [5_000, 10_000],
  ) {}

  async *generate(systemPrompt: string, turns: readonly ChatTurn[]): AsyncIterable<string> {
    // This timeout also covers the read of the streamed body, so it is longer than a slow reply.
    const ai = new GoogleGenAI({apiKey: this.key(), httpOptions: {timeout: 90_000}});
    const contents: Content[] = turns.map(turn => ({
      role: turn.fromUser ? 'user' : 'model',
      parts: [{text: turn.text}],
    }));
    const declarations = Object.values(readTools).map(tool => tool.declaration);
    for (;;) {
      const parts: Part[] = [];
      for (let attempt = 0; ; attempt++) {
        let yielded = false;
        try {
          const stream = await ai.models.generateContentStream({
            model: modelName,
            contents,
            config: {
              systemInstruction: systemPrompt,
              tools: [{functionDeclarations: declarations}],
            },
          });
          for await (const chunk of stream) {
            for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
              parts.push(part);
              if (part.text && !part.thought) {
                yielded = true;
                yield part.text;
              }
            }
          }
          break;
        } catch (error) {
          // The renderer already shows a chunk that was yielded, so a retry would show it twice.
          if (yielded || attempt >= this.retryWaitsMs.length) throw error;
          parts.length = 0;
          await new Promise(resolve => setTimeout(resolve, this.retryWaitsMs[attempt]));
        }
      }
      const calls = parts.filter(part => part.functionCall);
      if (calls.length === 0) return;
      // The model's parts go back unchanged, so that it gets its thought signatures.
      contents.push({role: 'model', parts});
      contents.push({
        role: 'user',
        parts: await Promise.all(
          calls.map(async ({functionCall}) => ({
            functionResponse: {
              name: functionCall!.name,
              response: {
                result: await readTools[functionCall!.name!].run(functionCall!.args ?? {}),
              },
            },
          })),
        ),
      });
    }
  }
}
