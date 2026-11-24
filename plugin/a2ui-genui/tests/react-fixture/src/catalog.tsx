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

import {createComponentImplementation, type ReactCatalogComponent} from '@a2ui/react';
import {Catalog, DynamicStringSchema, basicCatalog} from '@a2ui/web_core/v1_0';
import {z} from 'zod';

const StatusBadge = createComponentImplementation(
  {
    name: 'StatusBadge',
    schema: z.object({label: DynamicStringSchema, status: z.enum(['info', 'success', 'warning'])}),
  },
  ({props}) => (
    <span data-testid="status-badge">
      {props.status}: {String(props.label ?? '')}
    </span>
  ),
);

const appCatalog = new Catalog<ReactCatalogComponent>(
  'https://example.com/catalogs/fixture/v1/catalog.json',
  '1.0',
  [StatusBadge],
);

export const catalogs = [basicCatalog, appCatalog] as Catalog<ReactCatalogComponent>[];
