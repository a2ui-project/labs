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

/// Each suite in conformance/craft/ and the test file in this directory that
/// runs it.
const Map<String, String> craftSuites = <String, String>{
  'craft/craft_text_format.yaml': 'text_format_test.dart',
  'craft/craft_libraries_and_names.yaml': 'libraries_and_names_test.dart',
  'craft/craft_binary_format.yaml': 'binary_format_test.dart',
  'craft/craft_language_extensions.yaml': 'language_extensions_test.dart',
  'craft/craft_functions.yaml': 'functions_test.dart',
};
