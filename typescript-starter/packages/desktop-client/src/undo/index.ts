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

import {send} from '@actual-app/core/platform/client/connection';

function throttle(callback: () => void, wait: number) {
  let waiting = false;
  return () => {
    if (!waiting) {
      callback();
      waiting = true;
      setTimeout(function () {
        waiting = false;
      }, wait);
    }
  };
}

const _undo = throttle(() => send('undo'), 100);
const _redo = throttle(() => send('redo'), 100);

let _undoEnabled = true;

export function enableUndo() {
  _undoEnabled = true;
}

export function disableUndo() {
  _undoEnabled = false;
}

export function undo() {
  if (_undoEnabled) {
    _undo();
  }
}

export function redo() {
  if (_undoEnabled) {
    _redo();
  }
}
