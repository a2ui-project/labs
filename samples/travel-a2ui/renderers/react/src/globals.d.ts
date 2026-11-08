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
 * What the page may put on `window` for the travel views.
 *
 * `google.maps` is the Maps JavaScript API once its script has loaded. The
 * key it is loaded with comes from `MapsKeyContext`, not from `window`.
 */
export {};

interface MapsLibraryLoader {
  // The library's classes (`Map`, `Marker`, …), typed by Google's own
  // `@types/google.maps`, which this package does not depend on.
  importLibrary(name: string): Promise<Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

declare global {
  interface Window {
    google?: {maps?: MapsLibraryLoader};
  }
}
