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

// Runs the shared conformance cases of the language_extensions feature
// (craft/conformance/language_extensions.yaml).

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

import 'cases.dart';
import 'resolution_cases.dart';

void main() {
  for (final ConformanceCase c in loadCases('language_extensions')) {
    if (c['queries'] != null) {
      test('${c.name} (${c.requirement})', () => runResolutionCase(c));
      continue;
    }
    final List<Object?> sources =
        c['sources'] as List<Object?>? ?? <Object?>[c['source']];
    for (final (int index, Object? source) in sources.indexed) {
      final String suffix = sources.length > 1 ? ' #$index' : '';
      test('${c.name}$suffix (${c.requirement})', () {
        _run(c['kind']! as String, source! as String, c.expect);
      });
    }
  }
}

void _run(String kind, String source, Map<String, Object?> expected) {
  Object? parse() => switch (kind) {
    'library' => <String, Object?>{
      'library': canonicalLibrary(parseLibraryFile(source)),
    },
    'data' => <String, Object?>{'data': canonicalValue(parseDataFile(source))},
    _ => throw StateError('Unknown kind: $kind'),
  };
  if (expected['error'] case final Map<String, Object?> error) {
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
    return;
  }
  expect(parse(), expected);
  if (kind == 'library') {
    final RemoteWidgetLibrary decoded = decodeLibraryBlob(
      encodeLibraryBlob(parseLibraryFile(source)),
    );
    expect(
      canonicalLibrary(decoded),
      expected['library'],
      reason: 'binary round trip',
    );
  }
}
