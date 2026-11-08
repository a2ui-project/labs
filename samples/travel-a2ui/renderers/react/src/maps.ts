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
 * The Google Maps settings a host gives the travel map views.
 *
 * A context rather than a global: the `GoogleMap` the agent composes is a leaf
 * of a tree no app code builds, so its settings cannot arrive as props; a
 * provider around the surfaces reaches every map in them.
 *
 *     <MapsKeyContext.Provider value={mapsApiKey}>…surfaces…</MapsKeyContext.Provider>
 *
 * The key is the deployment's public, referrer-restricted Maps JavaScript API
 * key. Without one, a map says it cannot load rather than failing silently.
 */

import {createContext} from 'react';

export const MapsKeyContext = createContext<string>('');
