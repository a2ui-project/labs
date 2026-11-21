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

// Runs the shared conformance cases of the binary_format feature
// (craft/conformance/binary_format.yaml).

import 'dart:typed_data';

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

import 'cases.dart';

void main() {
  for (final ConformanceCase c in loadCases('binary_format')) {
    test('${c.name} (${c.requirement})', () {
      if (c['decode'] != null) {
        _runDecoderCase(c);
      } else {
        _runEncoderCase(c);
      }
    });
  }
}

/// Parses the case format's hex: byte pairs separated by whitespace, with
/// `#` comments to the end of the line.
Uint8List _unhex(String hex) => Uint8List.fromList(<int>[
  for (final String line in hex.split('\n'))
    for (final String byte
        in line.split('#').first.trim().split(RegExp(r'\s+')))
      if (byte.isNotEmpty) int.parse(byte, radix: 16),
]);

Object? _decode(String kind, Uint8List bytes) => switch (kind) {
  'library' => canonicalLibrary(decodeLibraryBlob(bytes)),
  'data' => canonicalValue(decodeDataBlob(bytes)),
  _ => throw StateError('Unknown kind: $kind'),
};

Object? _parse(String kind, String source) => switch (kind) {
  'library' => canonicalLibrary(parseLibraryFile(source)),
  'data' => canonicalValue(parseDataFile(source)),
  _ => throw StateError('Unknown kind: $kind'),
};

Uint8List _encode(String kind, String source) => switch (kind) {
  'library' => encodeLibraryBlob(parseLibraryFile(source)),
  'data' => encodeDataBlob(parseDataFile(source)),
  _ => throw StateError('Unknown kind: $kind'),
};

void _runDecoderCase(ConformanceCase c) {
  final String kind = c['decode']! as String;
  final Uint8List bytes = _unhex(c['hex']! as String);
  final Map<String, Object?> expected = c.expect;
  final Object? error = expected['error'];
  if (error is Map<String, Object?>) {
    expect(
      () => _decode(kind, bytes),
      throwsA(
        isA<BlobFormatException>()
            .having(
              (BlobFormatException e) => e.kind.name,
              'kind',
              error['kind'],
            )
            .having(
              (BlobFormatException e) => e.offset,
              'offset',
              error['offset'],
            )
            .having(
              (BlobFormatException e) => e.blobVersion,
              'blobVersion',
              error['version'],
            )
            .having((BlobFormatException e) => e.tag, 'tag', error['tag']),
      ),
    );
  } else if (expected['source'] case final String source) {
    expect(_decode(kind, bytes), _parse(kind, source));
  } else {
    expect(<String, Object?>{kind: _decode(kind, bytes)}, expected);
  }
}

void _runEncoderCase(ConformanceCase c) {
  final String kind = c['encode']! as String;
  final String source = c['source']! as String;
  final Map<String, Object?> expected = c.expect;
  if (expected.containsKey('error')) {
    // Parsing must succeed, so that only the encoder can reject the source.
    final Object parsed = switch (kind) {
      'library' => parseLibraryFile(source),
      _ => parseDataFile(source),
    };
    expect(
      () => parsed is RemoteWidgetLibrary
          ? encodeLibraryBlob(parsed)
          : encodeDataBlob(parsed),
      throwsA(anything),
    );
    return;
  }
  final Uint8List bytes = _unhex(expected['hex']! as String);
  expect(_encode(kind, source), bytes);
  final Object? decoded = switch (expected['decoded']) {
    final Map<String, Object?> decoded => decoded[kind],
    _ => _parse(kind, source),
  };
  expect(_decode(kind, bytes), decoded, reason: 'round trip');
  final Uint8List reencoded = switch (kind) {
    'library' => encodeLibraryBlob(decodeLibraryBlob(bytes)),
    _ => encodeDataBlob(decodeDataBlob(bytes)),
  };
  expect(reencoded, bytes, reason: 'encoding the decoded blob');
}
