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

import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import convict from 'convict';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {applyFileEnv, readFileEnv} from './config-file-env';

describe('config file env', () => {
  let secretDirectory: string;

  const buildSchema = () =>
    convict({
      openId: {
        doc: 'OpenID settings.',
        client_secret: {
          doc: 'Client secret',
          format: String,
          default: '',
          env: 'TEST_SECRET',
        },
      },
    });

  const writeSecret = (name: string, contents: string) => {
    const filePath = join(secretDirectory, name);
    writeFileSync(filePath, contents);
    return filePath;
  };

  beforeEach(() => {
    secretDirectory = mkdtempSync(join(tmpdir(), 'actual-config-file-env-'));
  });

  afterEach(() => {
    rmSync(secretDirectory, {recursive: true, force: true});
  });

  describe('readFileEnv', () => {
    it('reads the contents of the file the variable points at', () => {
      const filePath = writeSecret('secret', 'from-file');

      expect(readFileEnv('TEST_SECRET_FILE', {TEST_SECRET_FILE: filePath})).toBe('from-file');
    });

    it('trims surrounding whitespace from the file value', () => {
      const filePath = writeSecret('secret', '  from-file\n');

      expect(readFileEnv('TEST_SECRET_FILE', {TEST_SECRET_FILE: filePath})).toBe('from-file');
    });

    it('returns undefined when the variable is not set', () => {
      expect(readFileEnv('TEST_SECRET_FILE', {})).toBeUndefined();
    });

    it('throws when the file cannot be read, naming the variable and path', () => {
      const missing = join(secretDirectory, 'does-not-exist');

      expect(() => readFileEnv('TEST_SECRET_FILE', {TEST_SECRET_FILE: missing})).toThrow(
        `Could not read TEST_SECRET_FILE from '${missing}'`,
      );
    });

    it('throws when the variable is set but empty', () => {
      // An empty value means a mount that did not produce a path. Falling back
      // to the plain variable here would hide the misconfiguration.
      expect(() => readFileEnv('TEST_SECRET_FILE', {TEST_SECRET_FILE: ''})).toThrow(
        'Could not read TEST_SECRET_FILE',
      );
    });
  });

  describe('applyFileEnv', () => {
    it('sets the value on the config and reports that it applied', () => {
      const config = buildSchema();
      const filePath = writeSecret('secret', 'from-file');

      const applied = applyFileEnv(config, 'TEST_SECRET_FILE', 'openId.client_secret', {
        TEST_SECRET_FILE: filePath,
      });

      expect(applied).toBe(true);
      expect(config.get('openId.client_secret')).toBe('from-file');
    });

    it('takes precedence over the plain environment variable', () => {
      const config = buildSchema();
      const filePath = writeSecret('secret', 'from-file');

      // convict has already imported TEST_SECRET at this point, exactly as it
      // would at startup.
      config.set('openId.client_secret', 'from-env');

      applyFileEnv(config, 'TEST_SECRET_FILE', 'openId.client_secret', {
        TEST_SECRET: 'from-env',
        TEST_SECRET_FILE: filePath,
      });

      expect(config.get('openId.client_secret')).toBe('from-file');
    });

    it('leaves the setting alone when the variable is not set', () => {
      const config = buildSchema();

      const applied = applyFileEnv(config, 'TEST_SECRET_FILE', 'openId.client_secret', {});

      expect(applied).toBe(false);
      expect(config.get('openId.client_secret')).toBe('');
      expect(() => config.validate({allowed: 'strict'})).not.toThrow();
    });
  });
});
