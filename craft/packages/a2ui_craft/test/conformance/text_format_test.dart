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

// Runs the shared conformance cases of the text_format feature
// (craft/conformance/text_format.yaml).

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

import 'cases.dart';

void main() {
  for (final ConformanceCase c in loadCases('text_format')) {
    test('${c.name} (${c.requirement})', () {
      final String source = c['source'] as String;
      final Map<String, Object?> expected = c.expect;
      Object? parse() => switch (c['kind']) {
        'library' => <String, Object?>{
          'library': canonicalLibrary(parseLibraryFile(source)),
        },
        'data' => <String, Object?>{
          'data': canonicalValue(parseDataFile(source)),
        },
        final Object? kind => throw StateError('Unknown kind: $kind'),
      };
      if (expected.containsKey('error')) {
        final Map<String, Object?> error =
            expected['error']! as Map<String, Object?>;
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
        expect(parse(), expected);
      }
    });
  }
}
