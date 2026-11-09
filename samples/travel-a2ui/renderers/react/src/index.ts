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
 * The travel catalog for the A2UI SDK renderers.
 *
 * Render with `@a2ui/web_core`'s `MessageProcessor` and `@a2ui/react`'s
 * `A2uiSurface`; this package supplies only what is travel: the catalog
 * (`createTravelCatalog`), its client-side functions, Markdown for `Text`, and
 * the stylesheet that themes the SDK's basic components and draws ours.
 */

export {createTravelCatalog, travelComponentNames, type CatalogDocument} from './catalog.js';
export {calcNights, equals} from './functions.js';
export {renderMarkdown} from './markdown.js';
export {Icon, hasIcon, type IconName, type IconProps} from './components/icons.js';
export {ariaFrom, type AriaAttributes} from './accessibility.js';
export {MapsKeyContext} from './maps.js';
