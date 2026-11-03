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

import { app, session } from 'electron';

app.on('web-contents-created', function (event, contents) {
  contents.on('will-attach-webview', function (event, webPreferences) {
    delete webPreferences.preload;

    webPreferences.nodeIntegration = false;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.experimentalFeatures = false;

    // For now, we never use <webview>. Just disable it entirely.
    event.preventDefault();
  });

  contents.on('will-navigate', event => {
    event.preventDefault();
  });
});

app.on('ready', function () {
  session.defaultSession.setPermissionRequestHandler(
    function (webContents, permission, callback) {
      const url = webContents.getURL();
      if (url.startsWith('file://')) {
        callback(true);
      } else {
        callback(false);
      }
    },
  );
});
