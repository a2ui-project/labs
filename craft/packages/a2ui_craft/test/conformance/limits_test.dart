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

// Runs the conformance suite of the craft_limits feature
// (craft/conformance/craft/craft_limits.yaml). The YAML header documents
// the case format.

import 'dart:typed_data';

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:a2ui_craft/model.dart';
import 'package:test/test.dart';

import 'conformance_harness.dart';
import 'runtime_engine.dart';

void main() {
  runConformanceSuite('craft/craft_limits.yaml', <String, ConformanceAction>{
    'parse_limits': const ConformanceAction(<String>{
      'limits_json',
      'invalid',
      'expect',
    }, _runJsonCase),
    'check_limits': const ConformanceAction(<String>{
      'limits',
      'input',
      'within',
      'beyond',
      'data',
      'expect',
    }, _runWithinBeyondCase),
    'expand_template': expandTemplateAction,
  });
}

void _runJsonCase(ConformanceTestCase c) {
  final Map<String, Object?> expected = c['expect']! as Map<String, Object?>;
  assertKnownKeys(expected, const <String>{'json'}, 'expect');
  final List<Object?> invalid = c['invalid'] as List<Object?>? ?? <Object?>[];
  for (final Object? json in invalid) {
    expect(
      () => CraftLimits.fromJson(json! as Map<String, Object?>),
      throwsArgumentError,
      reason: '$json',
    );
  }
  expect(
    CraftLimits.fromJson(c['limits_json']! as Map<String, Object?>).toJson(),
    expected['json'],
  );
}

/// Runs a parse, decode, register or evaluate case: every input in `within`
/// is accepted, and every input in `beyond` fails as `expect` says.
void _runWithinBeyondCase(ConformanceTestCase c) {
  final CraftLimits limits = caseLimits(c)!;
  final String kind = c['input']! as String;
  assertKnownKeys(
    c['expect']! as Map<String, Object?>,
    kind == 'evaluate' ? const <String>{'error'} : const <String>{'limit'},
    'expect',
  );
  final void Function(Object? input) run = switch (kind) {
    'parse_library' ||
    'parse_data' => (Object? input) => _parse(kind, input, limits),
    'decode_library' ||
    'decode_data' => (Object? input) => _decode(kind, input, limits),
    'register' =>
      (Object? input) => TemplateRegistry(limits: limits).setTemplateLibrary(
        const LibraryName(<String>['main']),
        parseLibraryFile(input! as String),
      ),
    'evaluate' => (Object? input) => _evaluate(c, input, limits),
    _ => throw StateError('Unknown input: $kind'),
  };
  for (final Object? input in c['within'] as List<Object?>? ?? <Object?>[]) {
    run(_input(input));
  }
  for (final Object? beyond in c['beyond'] as List<Object?>? ?? <Object?>[]) {
    final Object? input = _input(beyond);
    expect(
      () => run(input),
      throwsA(_failure(c, kind, beyond)),
      reason: '$input',
    );
  }
}

/// The input of a `within` or `beyond` entry: the entry, or its `source` or
/// `hex`.
Object? _input(Object? entry) => switch (entry) {
  final Map<String, Object?> map => map['source'] ?? map['hex'],
  _ => entry,
};

Matcher _failure(ConformanceTestCase c, String kind, Object? beyond) {
  final Map<String, Object?> expected = c['expect']! as Map<String, Object?>;
  final Map<String, Object?> position = beyond is Map<String, Object?>
      ? beyond
      : const <String, Object?>{};
  if (kind.startsWith('parse_')) {
    return isA<ParserException>()
        .having(
          (ParserException e) => e.limit?.name,
          'limit',
          expected['limit'],
        )
        .having((ParserException e) => e.line, 'line', position['line']);
  }
  if (kind.startsWith('decode_')) {
    return isA<BlobFormatException>()
        .having(
          (BlobFormatException e) => e.kind,
          'kind',
          BlobErrorKind.limitExceeded,
        )
        .having(
          (BlobFormatException e) => e.limit?.name,
          'limit',
          expected['limit'],
        )
        .having(
          (BlobFormatException e) => e.offset,
          'offset',
          position['offset'],
        );
  }
  if (kind == 'register') {
    return isA<CraftLimitException>().having(
      (CraftLimitException e) => e.limit.name,
      'limit',
      expected['limit'],
    );
  }
  return isA<EvaluationException>().having(
    (EvaluationException e) => e.kind.name,
    'kind',
    expected['error'],
  );
}

void _parse(String kind, Object? source, CraftLimits limits) {
  if (kind == 'parse_library') {
    parseLibraryFile(source! as String, limits: limits);
  } else {
    parseDataFile(source! as String, limits: limits);
  }
}

void _decode(String kind, Object? hex, CraftLimits limits) {
  final Uint8List bytes = Uint8List.fromList(<int>[
    for (final String line in (hex! as String).split('\n'))
      for (final String byte
          in line.split('#').first.trim().split(RegExp(r'\s+')))
        if (byte.isNotEmpty) int.parse(byte, radix: 16),
  ]);
  if (kind == 'decode_library') {
    decodeLibraryBlob(bytes, limits: limits);
  } else {
    decodeDataBlob(bytes, limits: limits);
  }
}

void _evaluate(ConformanceTestCase c, Object? expression, CraftLimits limits) {
  final RemoteWidgetLibrary library = parseLibraryFile(
    'widget test = Result(value: $expression);',
  );
  final ConstructorCall root = library.widgets.single.root as ConstructorCall;
  TemplateRegistry(limits: limits).evaluate(
    root.arguments['value'],
    library: const LibraryName(<String>['test']),
    data: c['data'] == null ? null : parseDataFile(c['data']! as String),
  );
}
