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

import {adoptStyles, type LitElement} from 'lit';

/**
 * Attaches an open shadow root to `element` and adopts the element class's `static styles`.
 *
 * `@a2ui/lit` 0.15 renders `A2uiLitElement` subclasses into light DOM, so the status-catalog
 * elements override `createRenderRoot()` to get a shadow root back. Returning a bare
 * `attachShadow()` skips the `adoptStyles()` call that `LitElement.createRenderRoot()` makes,
 * which leaves every `static styles` rule unapplied (badges render as plain text and the
 * stepper as a numbered list). Use this helper from every such override instead.
 */
export function createStyledShadowRoot(element: LitElement): ShadowRoot {
  const root = element.attachShadow({mode: 'open'});
  adoptStyles(root, (element.constructor as typeof LitElement).elementStyles);
  return root;
}
