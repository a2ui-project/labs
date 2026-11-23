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

// The parse_library and parse_data actions (see craft_text_format.yaml).

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

import 'conformance_harness.dart';

/// The handlers of parse_library and parse_data.
final Map<String, ConformanceAction> parseActions = <String, ConformanceAction>{
  'parse_library': ConformanceAction(
    const <String>{'source', 'sources', 'expect', 'binary_round_trip'},
    (ConformanceTestCase c) => _run(c, 'library'),
    variants: ('sources', 'source'),
  ),
  'parse_data': ConformanceAction(
    const <String>{'source', 'sources', 'expect'},
    (ConformanceTestCase c) => _run(c, 'data'),
    variants: ('sources', 'source'),
  ),
};

void _run(ConformanceTestCase c, String kind) {
  final String source = c['source']! as String;
  final Map<String, Object?> expected = c['expect']! as Map<String, Object?>;
  assertKnownKeys(expected, <String>{kind, 'error'}, 'expect');
  Object? parse() => switch (kind) {
    'library' => canonicalLibrary(parseLibraryFile(source)),
    _ => canonicalValue(parseDataFile(source)),
  };
  if (expected['error'] case final Map<String, Object?> error) {
    assertKnownKeys(error, const <String>{'line'}, 'expect.error');
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
  expect(<String, Object?>{kind: parse()}, expected);
  if (c['binary_round_trip'] == true) {
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
