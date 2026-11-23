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

// Tests of the conformance harness itself: every suite is run, and a case
// with an unknown action or key fails.

import 'dart:io';

import 'package:test/test.dart';

import 'conformance_harness.dart';
import 'parse_cases.dart';
import 'suite_registry.dart';

const ConformanceTestCase _valid = <String, Object?>{
  'name': 'valid',
  'action': 'parse_data',
  'features': <Object?>['F-CRAFT-TEXT-01'],
  'description': 'A data file.',
  'source': '{ a: "b" }',
  'expect': <String, Object?>{
    'data': <String, Object?>{'a': 'b'},
  },
};

void main() {
  test('every suite in conformance/craft/ is run by its test file', () {
    final Directory root = conformanceRoot();
    expect(
      <String>[
        for (final FileSystemEntity f in Directory(
          '${root.path}/craft',
        ).listSync())
          if (f.path.endsWith('.yaml')) 'craft/${f.uri.pathSegments.last}',
      ]..sort(),
      craftSuites.keys.toList()..sort(),
    );
    for (final MapEntry<String, String> suite in craftSuites.entries) {
      expect(
        File('test/conformance/${suite.value}').readAsStringSync(),
        contains("'${suite.key}'"),
        reason: suite.value,
      );
    }
  });

  test('a valid case passes', () {
    runConformanceCase('test.yaml', _valid, parseActions);
  });

  test('an unknown action fails', () {
    expect(
      () => runConformanceCase('test.yaml', <String, Object?>{
        ..._valid,
        'action': 'parse_dat',
      }, parseActions),
      throwsA(
        isA<TestFailure>().having(
          (TestFailure e) => e.message,
          'message',
          contains("Unknown action 'parse_dat'"),
        ),
      ),
    );
  });

  test('an unknown key fails', () {
    expect(
      () => runConformanceCase('test.yaml', <String, Object?>{
        ..._valid,
        'sorce': '{}',
      }, parseActions),
      throwsA(isA<UnknownConformanceKeyError>()),
    );
  });

  test('an unknown expectation fails', () {
    expect(
      () => runConformanceCase('test.yaml', <String, Object?>{
        ..._valid,
        'expect': <String, Object?>{
          'data': <String, Object?>{'a': 'b'},
          'line': 1,
        },
      }, parseActions),
      throwsA(isA<UnknownConformanceKeyError>()),
    );
  });
}
