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

// Runs the shared conformance cases of the libraries_and_names feature
// (craft/conformance/libraries_and_names.yaml).

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

import 'cases.dart';
import 'resolution_cases.dart';

void main() {
  for (final ConformanceCase c in loadCases('libraries_and_names')) {
    test('${c.name} (${c.requirement})', () {
      if (c['source'] != null) {
        _runParseCase(c);
      } else {
        runResolutionCase(c);
      }
    });
  }
}

void _runParseCase(ConformanceCase c) {
  Map<String, Object?> parse() => <String, Object?>{
    'library': canonicalLibrary(parseLibraryFile(c['source']! as String)),
  };
  final Object? error = c.expect['error'];
  if (error is Map<String, Object?>) {
    expect(
      parse,
      throwsA(
        isA<ParserException>().having(
          (ParserException e) => e.line,
          'line',
          error['line'] ?? anything,
        ),
      ),
    );
  } else {
    expect(parse(), c.expect);
  }
}
