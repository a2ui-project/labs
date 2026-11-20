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

// Loads and runs the Craft conformance suites (conformance/craft/*.yaml),
// following A2UI's harness conventions (conformance/README.md in A2UI): one
// test per case, dispatched on its `action`, unknown actions and keys fail,
// and an executed-case manifest when A2UI_CONFORMANCE_MANIFEST_DIR is set.

import 'dart:convert';
import 'dart:io';
import 'dart:isolate';

import 'package:test/test.dart';
import 'package:yaml/yaml.dart';

/// A decoded conformance case.
typedef ConformanceTestCase = Map<String, Object?>;

/// The harness name in executed-case manifests and in `features.yaml`.
const String harnessName = 'dart-craft';

/// Keys every case may have, whatever its action.
const Set<String> caseMetadataKeys = <String>{
  'action',
  'description',
  'features',
  'name',
};

/// Thrown when a case holds a key that its handler doesn't read.
class UnknownConformanceKeyError extends TestFailure {
  UnknownConformanceKeyError(super.message);
}

/// Fails unless every key of [obj] is in [allowed].
void assertKnownKeys(
  Map<String, Object?> obj,
  Set<String> allowed,
  String where,
) {
  final List<String> unknown = <String>[
    for (final String key in obj.keys)
      if (!allowed.contains(key)) key,
  ]..sort();
  if (unknown.isNotEmpty) {
    throw UnknownConformanceKeyError('Unknown keys at $where: $unknown');
  }
}

/// How a suite runs the cases of one action.
class ConformanceAction {
  const ConformanceAction(this.keys, this.run, {this.variants});

  /// The keys the action reads, besides [caseMetadataKeys].
  final Set<String> keys;

  /// Runs one case; fails the test when the case's expectations don't hold.
  final void Function(ConformanceTestCase testCase) run;

  /// A list key and the key each of its elements stands for: a case with the
  /// list runs as one test per element, each with that element as the single
  /// key (`sources` and `source`, for instance).
  final (String list, String single)? variants;
}

/// The `conformance/` directory: the nearest one, from the current
/// directory up, that holds `conformance_schema.json`.
///
/// Tests run from the package directory; walking up also finds the suites
/// when the package moves.
Directory conformanceRoot() {
  Directory dir = Directory.current.absolute;
  while (true) {
    final Directory candidate = Directory('${dir.path}/conformance');
    if (File('${candidate.path}/conformance_schema.json').existsSync()) {
      return candidate;
    }
    if (dir.parent.path == dir.path) {
      throw StateError(
        'No conformance/ directory above ${Directory.current.path}.',
      );
    }
    dir = dir.parent;
  }
}

/// Loads [suite], a path relative to [conformanceRoot] such as
/// `craft/craft_text_format.yaml`.
List<ConformanceTestCase> loadConformanceSuite(String suite) {
  final File file = File('${conformanceRoot().path}/$suite');
  final Object? cases = normalizeYaml(loadYaml(file.readAsStringSync()));
  if (cases is! List<Object?>) {
    throw StateError('$suite must be a list of cases.');
  }
  return <ConformanceTestCase>[
    for (final Object? c in cases) c! as ConformanceTestCase,
  ];
}

/// Converts YAML nodes into plain lists and maps with string keys.
Object? normalizeYaml(Object? node) => switch (node) {
  YamlMap() => <String, Object?>{
    for (final MapEntry<Object?, Object?> entry in node.entries)
      entry.key.toString(): normalizeYaml(entry.value),
  },
  YamlList() => <Object?>[for (final Object? e in node) normalizeYaml(e)],
  _ => node,
};

/// Registers one test per case of [suite] (one per element for a case with
/// [ConformanceAction.variants]), which runs the case with
/// [runConformanceCase].
void runConformanceSuite(String suite, Map<String, ConformanceAction> actions) {
  final List<ConformanceTestCase> cases = loadConformanceSuite(suite);
  if (cases.isEmpty) {
    test(suite, () => fail('$suite has no cases.'));
  }
  for (final ConformanceTestCase c in cases) {
    final String name = c['name']! as String;
    final List<ConformanceTestCase> runs = _variants(
      c,
      actions[c['action']]?.variants,
    );
    int finished = 0;
    bool failed = false;
    for (final (int index, ConformanceTestCase run) in runs.indexed) {
      test(runs.length > 1 ? '$name #$index' : name, () {
        try {
          runConformanceCase(suite, c, actions, variant: run);
        } catch (error) {
          failed = true;
          rethrow;
        } finally {
          finished += 1;
          if (finished == runs.length) {
            recordManifest(suite, name, failed ? 'failed' : 'passed');
          }
        }
      });
    }
  }
}

/// Runs case [c] of [suite] (or its [variant]) with the handler of its
/// action; an unknown action or a key the handler doesn't read fails it.
void runConformanceCase(
  String suite,
  ConformanceTestCase c,
  Map<String, ConformanceAction> actions, {
  ConformanceTestCase? variant,
}) {
  final String where = '$suite#${c['name']}';
  final ConformanceAction? action = actions[c['action']];
  if (action == null) {
    fail("Unknown action '${c['action']}' in $where");
  }
  assertKnownKeys(c, <String>{...caseMetadataKeys, ...action.keys}, where);
  action.run(variant ?? c);
}

List<ConformanceTestCase> _variants(
  ConformanceTestCase c,
  (String, String)? variants,
) {
  if (variants == null) return <ConformanceTestCase>[c];
  final (String list, String single) = variants;
  final Object? elements = c[list];
  if (elements is! List<Object?>) return <ConformanceTestCase>[c];
  return <ConformanceTestCase>[
    for (final Object? element in elements)
      <String, Object?>{...c, single: element}..remove(list),
  ];
}

/// Appends a record for [name] of [suite] to the executed-case manifest
/// (A2UI's executed_case_manifest.schema.json) when
/// A2UI_CONFORMANCE_MANIFEST_DIR is set.
void recordManifest(String suite, String name, String status, [String? why]) {
  final String? dir = Platform.environment['A2UI_CONFORMANCE_MANIFEST_DIR'];
  if (dir == null || dir.isEmpty) return;
  Directory(dir).createSync(recursive: true);
  final Map<String, Object?> record = <String, Object?>{
    'harness': harnessName,
    'suite': suite,
    'case': name,
    'status': status,
    'reason': ?why,
  };
  File(
    '$dir/$harnessName-$pid-${Isolate.current.hashCode}.jsonl',
  ).writeAsStringSync(
    '${jsonEncode(record)}\n',
    mode: FileMode.append,
    flush: true,
  );
}
