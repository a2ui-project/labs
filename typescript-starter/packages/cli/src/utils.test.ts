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

import { parseBoolFlag, parseIntFlag } from './utils';

describe('parseBoolFlag', () => {
  it('parses "true"', () => {
    expect(parseBoolFlag('true', '--flag')).toBe(true);
  });

  it('parses "false"', () => {
    expect(parseBoolFlag('false', '--flag')).toBe(false);
  });

  it('rejects other strings', () => {
    expect(() => parseBoolFlag('yes', '--flag')).toThrow(
      'Invalid --flag: "yes". Expected "true" or "false".',
    );
  });

  it('includes the flag name in the error message', () => {
    expect(() => parseBoolFlag('1', '--offbudget')).toThrow(
      'Invalid --offbudget',
    );
  });
});

describe('parseIntFlag', () => {
  it('parses a valid integer string', () => {
    expect(parseIntFlag('42', '--balance')).toBe(42);
  });

  it('parses zero', () => {
    expect(parseIntFlag('0', '--balance')).toBe(0);
  });

  it('parses negative integers', () => {
    expect(parseIntFlag('-10', '--balance')).toBe(-10);
  });

  it('rejects decimal values', () => {
    expect(() => parseIntFlag('3.5', '--balance')).toThrow(
      'Invalid --balance: "3.5". Expected an integer.',
    );
  });

  it('rejects non-numeric strings', () => {
    expect(() => parseIntFlag('abc', '--balance')).toThrow(
      'Invalid --balance: "abc". Expected an integer.',
    );
  });

  it('rejects partially numeric strings', () => {
    expect(() => parseIntFlag('3abc', '--balance')).toThrow(
      'Invalid --balance: "3abc". Expected an integer.',
    );
  });

  it('rejects empty string', () => {
    expect(() => parseIntFlag('', '--balance')).toThrow(
      'Invalid --balance: "". Expected an integer.',
    );
  });

  it('includes the flag name in the error message', () => {
    expect(() => parseIntFlag('x', '--amount')).toThrow('Invalid --amount');
  });
});
