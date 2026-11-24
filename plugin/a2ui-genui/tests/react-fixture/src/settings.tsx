// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const keyName = 'a2ui-gemini-key';

export const storedKey = () => localStorage.getItem(keyName) ?? '';

export const KeyLink = () => <a href="#settings">Add a Gemini key</a>;

export function Settings() {
  return (
    <section aria-label="Settings">
      {/* Never give this field the stored key: a test runner's failure snapshot copies the page's text to disk. */}
      <input
        type="password"
        aria-label="Gemini key"
        placeholder={storedKey() ? 'A key is stored' : 'Gemini key'}
        onChange={event => localStorage.setItem(keyName, event.target.value)}
      />
    </section>
  );
}
