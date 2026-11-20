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

import 'dart:io';

import 'package:yaml/yaml.dart';

/// One case from a conformance file in `craft/conformance/`.
class ConformanceCase {
  ConformanceCase(this._fields);

  final Map<String, Object?> _fields;

  String get name => _fields['name']! as String;
  String get requirement => _fields['requirement']! as String;
  Map<String, Object?> get expect => _fields['expect']! as Map<String, Object?>;

  Object? operator [](String key) => _fields[key];
}

/// Loads the cases of [feature] from `craft/conformance/<feature>.yaml`.
///
/// Tests run from the package directory, two levels below `craft/`.
List<ConformanceCase> loadCases(String feature) {
  final File file = File('../../conformance/$feature.yaml');
  final Object? cases = _plain(loadYaml(file.readAsStringSync()));
  return <ConformanceCase>[
    for (final Object? c in cases! as List<Object?>)
      ConformanceCase(c! as Map<String, Object?>),
  ];
}

/// Converts YAML nodes into plain lists and maps with string keys.
Object? _plain(Object? node) => switch (node) {
  YamlMap() => <String, Object?>{
    for (final MapEntry<Object?, Object?> entry in node.entries)
      entry.key.toString(): _plain(entry.value),
  },
  YamlList() => <Object?>[for (final Object? e in node) _plain(e)],
  _ => node,
};
