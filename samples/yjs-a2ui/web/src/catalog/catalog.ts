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

import {
  A2UI_RENDERER_CONFIG,
  A2uiRendererService,
  provideMarkdownRenderer,
  type RendererConfiguration,
} from '@a2ui/angular';
import {BasicCatalog} from '@a2ui/angular/v0_9';
import {type ActionListener} from '@a2ui/web_core/v0_9';
import {type Provider} from '@angular/core';

/** Canonical A2UI v0.9 BasicCatalog ID shared with the Go backend. */
export const BASIC_CATALOG_ID = 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json';

function renderInlineMarkdownSafe(raw: string): Promise<string> {
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const formatted = escaped
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return Promise.resolve(formatted);
}

/**
 * Creates component-level providers giving a `SurfacePane` its own isolated
 * `A2uiRendererService` and `BasicCatalog` instance.
 */
export function provideIsolatedA2uiRenderer(actionHandler?: ActionListener): Provider[] {
  return [
    provideMarkdownRenderer(renderInlineMarkdownSafe),
    {
      provide: A2UI_RENDERER_CONFIG,
      useFactory: (): RendererConfiguration => ({
        catalogs: [new BasicCatalog({id: BASIC_CATALOG_ID})],
        actionHandler,
        processorOptions: {
          version: '0.9',
          reportErrorsOnly: true,
        },
      }),
    },
    A2uiRendererService,
  ];
}
