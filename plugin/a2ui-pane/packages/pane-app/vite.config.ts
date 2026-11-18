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

import {defineConfig, type Plugin} from 'vite';
import {a2uiDevPlugin} from './src/dev-server.js';

function queryPreservingScriptsPlugin(): Plugin {
  return {
    name: 'query-preserving-scripts',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /(<script\b[^>]*src="([^"]+)"[^>]*><\/script>)/g,
        (match, fullTag, src) => {
          if (src.startsWith('http://') || src.startsWith('https://')) {
            return match;
          }
          const isModule = /type=["']module["']/.test(fullTag);
          return `<script>
      (function() {
        var s = document.createElement('script');
        ${isModule ? "s.type = 'module'; s.crossOrigin = '';" : ''}
        s.src = '${src}' + (window.location.search || '');
        document.head.appendChild(s);
      })();
    </script>`;
        },
      );
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
  plugins: [a2uiDevPlugin(), queryPreservingScriptsPlugin()],
});
