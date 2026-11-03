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

import { unicodeLike } from './unicodeLike';

describe('unicode LIKE functionality', () => {
  it('empty pattern should not match to a value', () => {
    const result = unicodeLike(null, 'value');

    expect(result).toBe(0);
  });

  it('empty pattern should not match to null', () => {
    const result = unicodeLike(null, null);

    expect(result).toBe(0);
  });

  it('should match special characters', () => {
    // oxlint-disable-next-line no-template-curly-in-string
    const result = unicodeLike('.*+^${}()|[]\\', '.*+^${}()|[]\\');

    expect(result).toBe(1);
  });

  it('should use ? as the single character placeholder', () => {
    const result = unicodeLike('t?st', 'test');

    expect(result).toBe(1);
  });

  it('should use % as the zero-or-more characters placeholder', () => {
    const result = unicodeLike('t%st', 'te123st');

    expect(result).toBe(1);
  });

  it('should ignore case for unicode', () => {
    const result = unicodeLike('á', 'Ábcdefg');

    expect(result).toBe(1);
  });

  it('should ignore case for ascii', () => {
    const result = unicodeLike('a', 'Abcdefg');

    expect(result).toBe(1);
  });

  it('should treat null value as empty string', () => {
    const result = unicodeLike('%', null);

    expect(result).toBe(1);
  });

  it('should not match null value to the string "null"', () => {
    const result = unicodeLike('null', null);

    expect(result).toBe(0);
  });

  it('should treat \\% as a literal % character instead of a wildcard', () => {
    expect(unicodeLike('100\\%', '100%')).toBe(1);
    expect(unicodeLike('100\\%', '1000')).toBe(0);
  });

  it('should treat \\? as a literal ? character instead of a wildcard', () => {
    expect(unicodeLike('what\\?', 'what?')).toBe(1);
    expect(unicodeLike('what\\?', 'what!')).toBe(0);
  });

  it('should treat \\\\ as a literal \\ character', () => {
    expect(unicodeLike('c:\\\\test', 'c:\\test')).toBe(1);
  });
});
