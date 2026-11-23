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

// Runs the conformance suite of the craft_libraries_and_names feature
// (craft/conformance/craft/craft_libraries_and_names.yaml).

import 'conformance_harness.dart';
import 'parse_cases.dart';
import 'resolution_cases.dart';

void main() {
  runConformanceSuite(
    'craft/craft_libraries_and_names.yaml',
    <String, ConformanceAction>{
      'parse_library': parseActions['parse_library']!,
      'resolve_names': resolveNamesAction,
    },
  );
}
