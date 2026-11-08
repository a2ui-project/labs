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

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import '@travel-a2ui/renderer/styles.css';
import './styles.css';

import App from './App.js';
import {Specimen} from './components/Specimen.js';

const container = document.getElementById('root');
if (!container) throw new Error('No #root element to mount into.');

// `/catalog/<Name>` is one component on its own; everything else is the app,
// which opens on the Catalog view at `/catalog`.
const specimen = /^\/catalog\/([A-Za-z][A-Za-z0-9]*)\/?$/.exec(window.location.pathname)?.[1];

createRoot(container).render(
  <StrictMode>{specimen ? <Specimen name={specimen} /> : <App />}</StrictMode>,
);
