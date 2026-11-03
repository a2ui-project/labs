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

import { html2Plain } from './ofx2json';

describe('html2Plain', () => {
  test('regular text works', async () => {
    expect(html2Plain('Hello, world!')).toBe('Hello, world!');
    expect(html2Plain('Hello, <b>world</b>!')).toBe('Hello, <b>world</b>!');
  });

  test('brackets are unescaped', async () => {
    expect(html2Plain('Hello, &lt;world&gt;!')).toBe('Hello, <world>!');
  });
  test('apostrophes are unescaped', async () => {
    expect(html2Plain('Hello, &#39;world&#39;!')).toBe("Hello, 'world'!");
  });
  test('quotes are unescaped', async () => {
    expect(html2Plain('Hello, &quot;world&quot;!')).toBe('Hello, "world"!');
  });
  test('ampersands are unescaped', async () => {
    expect(html2Plain('Hello, &amp;world&amp;!')).toBe('Hello, &world&!');
    expect(html2Plain('Hello, &#038;world&#038;!')).toBe('Hello, &world&!');
  });
  test('no double unescaping with other entities', async () => {
    expect(html2Plain('Hello, &amp;#038;world&amp;#038;!')).toBe(
      'Hello, &#038;world&#038;!',
    );
    expect(html2Plain('Hello, &#038;amp;world&#038;amp;!')).toBe(
      'Hello, &amp;world&amp;!',
    );
    expect(html2Plain('Hello, &amp;quot;world&amp;quot;!')).toBe(
      'Hello, &quot;world&quot;!',
    );
  });
});
