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

/**
 * Markdown for the SDK's `Text`.
 *
 * A2UI 1.0's `Text` is Markdown — a heading is `### Outbound`, not a variant —
 * and `@a2ui/react` renders it with whatever the app puts in `MarkdownContext`.
 * Raw HTML, images and links are off: the spec allows "simple Markdown
 * formatting … without HTML, images, or links", and text the agent writes is
 * not a place to load anything from.
 */

import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({html: false, linkify: false, typographer: true});
md.disable(['image', 'link', 'autolink']);

/** The SDK's `MarkdownRenderer` contract: Markdown in, HTML out, asynchronously. */
export async function renderMarkdown(source: string): Promise<string> {
  return md.render(source ?? '');
}
