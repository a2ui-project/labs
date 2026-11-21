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

/// The framework-independent core of Craft: the template language, its data
/// model and its formats. It has no UI-framework dependency, so any framework
/// adapter can build on it.
library;

export 'src/canonical_json.dart';
export 'src/dependencies.dart';
export 'src/evaluator.dart';
export 'src/functions.dart';
export 'src/name_resolution.dart';
export 'src/rfw/binary.dart';
export 'src/rfw/model.dart';
export 'src/rfw/text.dart';
export 'src/standard_functions.dart';
export 'src/template_registry.dart';
