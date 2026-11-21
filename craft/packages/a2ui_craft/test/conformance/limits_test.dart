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

// Runs the shared conformance cases of the limits feature
// (craft/conformance/limits.yaml). The YAML header documents the case
// format.

import 'dart:typed_data';

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

import 'cases.dart';
import 'runtime_engine.dart';

void main() {
  for (final ConformanceCase c in loadCases('limits')) {
    test('${c.name} (${c.requirement})', () {
      if (c['limits_json'] != null) {
        _runJsonCase(c);
      } else if (c['expand'] == true) {
        RuntimeEngine(c).run(c);
      } else {
        _runWithinBeyondCase(c);
      }
    });
  }
}

void _runJsonCase(ConformanceCase c) {
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
    c.expect['json'],
  );
}

/// Runs a parse, decode, register or evaluate case: every input in `within`
/// is accepted, and every input in `beyond` fails as `expect` says.
void _runWithinBeyondCase(ConformanceCase c) {
  final CraftLimits limits = caseLimits(c)!;
  final void Function(Object? input) run = switch (c) {
    _ when c['parse'] != null => (Object? input) => _parse(c, input, limits),
    _ when c['decode'] != null => (Object? input) => _decode(c, input, limits),
    _ when c['register'] == true =>
      (Object? input) => TemplateRegistry(limits: limits).setTemplateLibrary(
        const LibraryName(<String>['main']),
        parseLibraryFile(input! as String),
      ),
    _ when c['evaluate'] == true => (Object? input) => _evaluate(
      c,
      input,
      limits,
    ),
    _ => throw StateError('Unknown case kind: ${c.name}'),
  };
  for (final Object? input in c['within'] as List<Object?>? ?? <Object?>[]) {
    run(_input(input));
  }
  for (final Object? beyond in c['beyond'] as List<Object?>? ?? <Object?>[]) {
    final Object? input = _input(beyond);
    expect(() => run(input), throwsA(_failure(c, beyond)), reason: '$input');
  }
}

/// The input of a `within` or `beyond` entry: the entry, or its `source` or
/// `hex`.
Object? _input(Object? entry) => switch (entry) {
  final Map<String, Object?> map => map['source'] ?? map['hex'],
  _ => entry,
};

Matcher _failure(ConformanceCase c, Object? beyond) {
  final Map<String, Object?> expected = c.expect;
  final Map<String, Object?> position = beyond is Map<String, Object?>
      ? beyond
      : const <String, Object?>{};
  if (c['parse'] != null) {
    return isA<ParserException>()
        .having(
          (ParserException e) => e.limit?.name,
          'limit',
          expected['limit'],
        )
        .having((ParserException e) => e.line, 'line', position['line']);
  }
  if (c['decode'] != null) {
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
  if (c['register'] == true) {
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

void _parse(ConformanceCase c, Object? source, CraftLimits limits) {
  switch (c['parse']) {
    case 'library':
      parseLibraryFile(source! as String, limits: limits);
    case 'data':
      parseDataFile(source! as String, limits: limits);
    default:
      throw StateError('Unknown kind: ${c['parse']}');
  }
}

void _decode(ConformanceCase c, Object? hex, CraftLimits limits) {
  final Uint8List bytes = Uint8List.fromList(<int>[
    for (final String line in (hex! as String).split('\n'))
      for (final String byte
          in line.split('#').first.trim().split(RegExp(r'\s+')))
        if (byte.isNotEmpty) int.parse(byte, radix: 16),
  ]);
  switch (c['decode']) {
    case 'library':
      decodeLibraryBlob(bytes, limits: limits);
    case 'data':
      decodeDataBlob(bytes, limits: limits);
    default:
      throw StateError('Unknown kind: ${c['decode']}');
  }
}

void _evaluate(ConformanceCase c, Object? expression, CraftLimits limits) {
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
