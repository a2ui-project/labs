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

// Removing the `#key=` fragment from the address bar, where there is one.
//
// On the web the fragment is replaced in the history entry, so the key is not
// in the URL a traveller copies or the page a reload restores. Elsewhere there
// is no address bar and nothing to do.

export 'url_fragment_stub.dart'
    if (dart.library.js_interop) 'url_fragment_web.dart';
