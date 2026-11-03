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

import type EventEmitter from 'events';

export type IpcClient = {
  on: EventEmitter['on'];
  emit: (name: string, data: unknown) => void;
};

type FileDialogOptions = {
  properties?: Array<'openFile' | 'openDirectory'>;
  filters?: {
    name: string;
    extensions: string[];
  }[];
};

type Actual = {
  IS_DEV: boolean;
  ACTUAL_VERSION: string;
  openURLInBrowser: (url: string) => void;
  openInFileManager: (filepath: string) => void;
  saveFile: (
    contents: string | Buffer,
    filename: string,
    dialogTitle?: string,
  ) => Promise<void>;
  openFileDialog: (options: FileDialogOptions) => Promise<string[]>;
  relaunch: () => void;
  reload: (() => Promise<void>) | undefined;
  restartElectronServer: () => void;
  moveBudgetDirectory: (
    currentBudgetDirectory: string,
    newDirectory: string,
  ) => Promise<void>;
  /**
   * Persists the budget data folder directly from the desktop app's main
   * process, so it works even when the backend failed to start. Validates
   * that the folder exists and is writable. The app must be relaunched
   * afterwards for the change to take effect.
   */
  setDocumentDir: (directory: string) => Promise<void>;
  applyAppUpdate: () => Promise<void>;
  ipcConnect: (callback: (client: IpcClient) => void) => void;
  getServerSocket: () => Promise<Worker | null>;
  setTheme: (theme: string) => void;
  logToTerminal: (...args: unknown[]) => void;
  onEventFromMain: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
  isUpdateReadyForDownload: () => boolean;
  waitForUpdateReadyForDownload: () => Promise<void>;
  startSyncServer: () => Promise<void>;
  stopSyncServer: () => Promise<void>;
  isSyncServerRunning: () => Promise<boolean>;
  startOAuthServer: () => Promise<string>;
};

declare global {
  var Actual: Actual;

  // oxlint-disable-next-line typescript/consistent-type-definitions -- global Window augmentation requires interface
  interface Window {
    Actual: Actual;
  }

  var IS_TESTING: boolean;

  var currentMonth: string | null;

  var emptyDatabase: (avoidUpdate?: boolean) => () => Promise<void>;
}
