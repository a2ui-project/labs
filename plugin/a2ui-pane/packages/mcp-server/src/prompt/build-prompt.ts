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

import {Catalog} from '@a2ui/web_core/catalog';
import {PROTOCOL_RULES} from './protocol-rules.js';

/**
 * Builds the complete system instruction prompt for agents describing A2UI protocol rules
 * and the specific component schemas available in the registered catalogs.
 */
export function buildPrompt(catalogs: Catalog<any>[]): string {
  const rules = PROTOCOL_RULES.trim();
  let prompt = `${rules}\n\n## 4. Available Component Catalogs\n\n`;

  for (const cat of catalogs) {
    const catalogId = cat.id || 'basic';
    prompt += `### Catalog: \`${catalogId}\`\n\n`;
    if (cat.components && cat.components.size > 0) {
      prompt += 'Available components and properties:\n';
      for (const [name, comp] of cat.components.entries()) {
        const shape = (comp.schema as any)?.shape;
        const propKeys = shape
          ? Object.keys(shape).filter(k => k !== 'weight' && k !== 'accessibility')
          : [];
        const propsDesc =
          propKeys.length > 0 ? propKeys.map(k => `\`${k}\``).join(', ') : 'no extra properties';
        prompt += `- **${name}**: ${propsDesc}\n`;
      }
    }
    prompt += '\n';
  }

  return prompt.trim();
}
