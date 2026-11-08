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

import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // The Python server serves this directory; source maps make a production bug
    // debuggable without a separate upload step.
    sourcemap: true,
    // One bundle of React, the A2UI SDK (with its Lit elements) and Markdown:
    // about 980 kB, 290 kB gzipped, served from the same origin as the API.
    chunkSizeWarningLimit: 1100,
  },
  server: {
    port: 5173,
    // In dev the app runs on Vite and the API on uvicorn; in production both
    // are the same origin. Proxying keeps the client's fetch paths identical in
    // both, so there is no "is this dev?" branch in application code.
    //
    // `ws` carries the voice socket. The Host header is left as the browser
    // sent it, so the server's same-origin check on that socket passes.
    proxy: {
      '/api': {target: 'http://127.0.0.1:8080', ws: true},
    },
  },
});
