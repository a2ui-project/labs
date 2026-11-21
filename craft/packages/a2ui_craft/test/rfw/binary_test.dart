// Copyright 2013 The Flutter Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// RFW 2.0.0's binary tests, adapted to run outside Flutter (imports, and
// testWidgets replaced by test) and to the Craft binary format (see the
// craft_binary_format blueprint):
//
//  * The encoders write Craft blobs, not RFW ones. Each expected encoding
//    starts with the Craft signature (FE 43 52 44 for data, FE 43 52 46 for
//    libraries) and the version header 01 00 01 00 instead of the RFW
//    signature, and every declaration has 8 bytes of flags (all zero) after
//    its name.
//  * The signature mismatch messages also name the RFW signature, which still
//    decodes.
//
// The tests that decode RFW blobs are otherwise unchanged: RFW blobs still
// decode, as version 0. The byte arrays keep RFW's layout of 16 bytes per
// line inside `dart format off` regions; the rest of the file is formatted.

import 'dart:typed_data';

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

// This is a number that requires more than 32 bits but less than 53 bits, so
// that it works in a JS Number and tests the logic that parses 64 bit ints as
// two separate 32 bit ints.
const int largeNumber = 9007199254730661;

void main() {
  test('String example', () async {
    final Uint8List bytes = encodeDataBlob('Hello');
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x44, 0x01, 0x00, 0x01, 0x00,  0x04, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x48, 0x65, 0x6C, 0x6C, 0x6F,
    ]);
    // dart format on
    final Object value = decodeDataBlob(bytes);
    expect(value, isA<String>());
    expect(value, 'Hello');
  });

  test('Big integer example', () async {
    // This value is intentionally inside the JS Number range but above 2^32.
    final Uint8List bytes = encodeDataBlob(largeNumber);
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x44, 0x01, 0x00, 0x01, 0x00,  0x02, 0xA5, 0xD7, 0xFF, 0xFF, 0xFF, 0xFF, 0x1F,
      0x00,
    ]);
    // dart format on
    final Object value = decodeDataBlob(bytes);
    expect(value, isA<int>());
    expect(value, largeNumber);
  });

  test('Big negative integer example', () async {
    final Uint8List bytes = encodeDataBlob(-largeNumber);
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x44, 0x01, 0x00, 0x01, 0x00,  0x02, 0x5B, 0x28, 0x00, 0x00, 0x00, 0x00, 0xE0,
      0xFF,
    ]);
    // dart format on
    final Object value = decodeDataBlob(bytes);
    expect(value, isA<int>());
    expect(value, -largeNumber);
  });

  test('Small integer example', () async {
    final Uint8List bytes = encodeDataBlob(1);
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x44, 0x01, 0x00, 0x01, 0x00,  0x02, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00,
    ]);
    // dart format on
    final Object value = decodeDataBlob(bytes);
    expect(value, isA<int>());
    expect(value, 1);
  });

  test('Small negative integer example', () async {
    final Uint8List bytes = encodeDataBlob(-1);
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x44, 0x01, 0x00, 0x01, 0x00,  0x02, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF,
    ]);
    // dart format on
    final Object value = decodeDataBlob(bytes);
    expect(value, isA<int>());
    expect(value, -1);
  });

  test('Zero integer example', () async {
    // This value is intentionally inside the JS Number range but above 2^32.
    final Uint8List bytes = encodeDataBlob(0);
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x44, 0x01, 0x00, 0x01, 0x00,  0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00,
    ]);
    // dart format on
    final Object value = decodeDataBlob(bytes);
    expect(value, isA<int>());
    expect(value, 0);
  });

  test('Map example', () async {
    final Uint8List bytes = encodeDataBlob(const <String, Object?>{'a': 15});
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x44, 0x01, 0x00, 0x01, 0x00,  0x07, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x61, 0x02, 0x0F, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00,
    ]);
    // dart format on
    final Object value = decodeDataBlob(bytes);
    expect(value, isA<DynamicMap>());
    expect(value, const <String, Object?>{'a': 15});
  });

  test('Signature check in decoders', () async {
    try {
      // dart format off
      decodeDataBlob(Uint8List.fromList(<int>[ 0xFE, 0x52, 0x46, 0x57, 0x04, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x48, 0x65, 0x6C, 0x6C, 0x6F ]));
      // dart format on
      fail('did not throw exception');
    } on FormatException catch (e) {
      expect(
        '$e',
        contains(
          'File signature mismatch. Expected FE 43 52 44 or FE 52 57 44 but found FE 52 46 57.',
        ),
      );
    }
    try {
      // dart format off
      decodeLibraryBlob(Uint8List.fromList(<int>[ 0xFE, 0x52, 0x57, 0x44, 0x04, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x48, 0x65, 0x6C, 0x6C, 0x6F ]));
      // dart format on
      fail('did not throw exception');
    } on FormatException catch (e) {
      expect(
        '$e',
        contains(
          'File signature mismatch. Expected FE 43 52 46 or FE 52 46 57 but found FE 52 57 44.',
        ),
      );
    }
  });

  test('Trailing byte check', () async {
    try {
      // dart format off
      decodeDataBlob(Uint8List.fromList(<int>[ 0xFE, 0x52, 0x57, 0x44, 0x00, 0x00 ]));
      // dart format on
      fail('did not throw exception');
    } on FormatException catch (e) {
      expect('$e', contains('Unexpected trailing bytes after value.'));
    }
    try {
      // dart format off
      decodeLibraryBlob(Uint8List.fromList(<int>[ 0xFE, 0x52, 0x46, 0x57, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]));
      // dart format on
      fail('did not throw exception');
    } on FormatException catch (e) {
      expect('$e', contains('Unexpected trailing bytes after constructors.'));
    }
  });

  test('Incomplete files in signatures', () async {
    try {
      // dart format off
      decodeDataBlob(Uint8List.fromList(<int>[ 0xFE, 0x52, 0x57 ]));
      // dart format on
      fail('did not throw exception');
    } on FormatException catch (e) {
      expect(
        '$e',
        contains('Could not read byte at offset 3: unexpected end of file.'),
      );
    }
    try {
      // dart format off
      decodeLibraryBlob(Uint8List.fromList(<int>[ 0xFE, 0x52, 0x46 ]));
      // dart format on
      fail('did not throw exception');
    } on FormatException catch (e) {
      expect(
        '$e',
        contains('Could not read byte at offset 3: unexpected end of file.'),
      );
    }
  });

  test('Incomplete files after signatures', () async {
    try {
      // dart format off
      decodeDataBlob(Uint8List.fromList(<int>[ 0xFE, 0x52, 0x57, 0x44 ]));
      // dart format on
      fail('did not throw exception');
    } on FormatException catch (e) {
      expect(
        '$e',
        contains('Could not read byte at offset 4: unexpected end of file.'),
      );
    }
    try {
      // dart format off
      decodeLibraryBlob(Uint8List.fromList(<int>[ 0xFE, 0x52, 0x46, 0x57 ]));
      // dart format on
      fail('did not throw exception');
    } on FormatException catch (e) {
      expect(
        '$e',
        contains('Could not read int64 at offset 4: unexpected end of file.'),
      );
    }
  });

  test('Invalid value tag', () async {
    try {
      // dart format off
      decodeDataBlob(Uint8List.fromList(<int>[ 0xFE, 0x52, 0x57, 0x44, 0xCC ]));
      // dart format on
      fail('did not throw exception');
    } on FormatException catch (e) {
      expect(
        '$e',
        contains('Unrecognized data type 0xCC while decoding blob.'),
      );
    }
  });

  test('Library encoder smoke test', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, isEmpty);
    expect(value.widgets, isEmpty);
  });

  test('Library encoder: imports', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[
        Import(LibraryName(<String>['a'])),
      ], <WidgetDeclaration>[]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, hasLength(1));
    expect(value.imports.single.name, const LibraryName(<String>['a']));
    expect(value.widgets, isEmpty);
  });

  test('Doubles', () async {
    final Uint8List bytes = encodeDataBlob(0.25);
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x44, 0x01, 0x00, 0x01, 0x00,  0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xD0,
      0x3F,
    ]);
    // dart format on
    final Object value = decodeDataBlob(bytes);
    expect(value, isA<double>());
    expect(value, 0.25);
  });

  test('Library decoder: invalid widget declaration root', () async {
    // dart format off
    final bytes = Uint8List.fromList(<int>[
      0xfe, 0x52, 0x46, 0x57, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x61, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0xEF,
    ]);
    // dart format on
    try {
      decodeLibraryBlob(bytes);
    } on FormatException catch (e) {
      expect(
        '$e',
        contains(
          'Unrecognized data type 0xEF while decoding widget declaration root.',
        ),
      );
    }
  });

  test('Library encoder: args references', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
        WidgetDeclaration(
          'a',
          null,
          ConstructorCall('b', <String, Object?>{
            'c': <Object?>[
              ArgsReference(<Object>['d', 5]),
            ],
          }),
        ),
      ]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x62, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x63, 0x05, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x0A, 0x02, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64,  0x02, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, isEmpty);
    expect(value.widgets, hasLength(1));
    expect(value.widgets.first.name, 'a');
    expect(value.widgets.first.initialState, isNull);
    expect(value.widgets.first.root, isA<ConstructorCall>());
    expect((value.widgets.first.root as ConstructorCall).name, 'b');
    expect(
      (value.widgets.first.root as ConstructorCall).arguments,
      hasLength(1),
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments.keys,
      <Object?>['c'],
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments['c'],
      hasLength(1),
    );
    expect(
      ((value.widgets.first.root as ConstructorCall).arguments['c']!
          as DynamicList)[0],
      isA<ArgsReference>(),
    );
    expect(
      (((value.widgets.first.root as ConstructorCall).arguments['c']!
                  as DynamicList)[0]!
              as ArgsReference)
          .parts,
      hasLength(2),
    );
    expect(
      (((value.widgets.first.root as ConstructorCall).arguments['c']!
                  as DynamicList)[0]!
              as ArgsReference)
          .parts[0],
      'd',
    );
    expect(
      (((value.widgets.first.root as ConstructorCall).arguments['c']!
                  as DynamicList)[0]!
              as ArgsReference)
          .parts[1],
      5,
    );
  });

  test('Library encoder: invalid args references', () async {
    try {
      encodeLibraryBlob(
        const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
          WidgetDeclaration(
            'a',
            null,
            ConstructorCall('b', <String, Object?>{
              'c': <Object?>[
                ArgsReference(<Object>[false]),
              ],
            }),
          ),
        ]),
      );
    } on StateError catch (e) {
      expect('$e', contains('Unexpected type bool while encoding blob.'));
    }
  });

  test('Library decoder: invalid args references', () async {
    // dart format off
    final bytes = Uint8List.fromList(<int>[
      0xfe, 0x52, 0x46, 0x57, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x61, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x09, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x62, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x63,
      0x05, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x0a, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0xAC,
    ]);
    // dart format on
    try {
      decodeLibraryBlob(bytes);
    } on FormatException catch (e) {
      expect(
        '$e',
        contains('Invalid reference type 0xAC while decoding blob.'),
      );
    }
  });

  test('Library encoder: switches', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
        WidgetDeclaration('a', null, Switch('b', <Object?, Object>{null: 'c'})),
      ]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x0F, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x62, 0x01, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x10, 0x04, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x63,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, isEmpty);
    expect(value.widgets, hasLength(1));
    expect(value.widgets.first.name, 'a');
    expect(value.widgets.first.initialState, isNull);
    expect(value.widgets.first.root, isA<Switch>());
    expect((value.widgets.first.root as Switch).input, 'b');
    expect((value.widgets.first.root as Switch).outputs, hasLength(1));
    expect((value.widgets.first.root as Switch).outputs.keys, <Object?>[null]);
    expect((value.widgets.first.root as Switch).outputs[null], 'c');
  });

  test('Library encoder: switches', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
        WidgetDeclaration('a', null, Switch('b', <Object?, Object>{'c': 'd'})),
      ]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x0F, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x62, 0x01, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x04, 0x01, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x63, 0x04, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, isEmpty);
    expect(value.widgets, hasLength(1));
    expect(value.widgets.first.name, 'a');
    expect(value.widgets.first.initialState, isNull);
    expect(value.widgets.first.root, isA<Switch>());
    expect((value.widgets.first.root as Switch).input, 'b');
    expect((value.widgets.first.root as Switch).outputs, hasLength(1));
    expect((value.widgets.first.root as Switch).outputs.keys, <Object?>['c']);
    expect((value.widgets.first.root as Switch).outputs['c'], 'd');
  });

  test('Bools', () async {
    final Uint8List bytes = encodeDataBlob(const <Object?>[false, true]);
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x44, 0x01, 0x00, 0x01, 0x00,  0x05, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x01,
    ]);
    // dart format on
    final Object value = decodeDataBlob(bytes);
    expect(value, isA<DynamicList>());
    expect(value, const <Object?>{false, true});
  });

  test('Library encoder: loops', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
        WidgetDeclaration(
          'a',
          null,
          ConstructorCall('b', <String, Object?>{
            'c': <Object?>[
              Loop(
                <Object?>[],
                ConstructorCall('d', <String, Object?>{
                  'e': LoopReference(0, <Object>[]),
                }),
              ),
            ],
          }),
        ),
      ]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x62, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x63, 0x05, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x05, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x64, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x65, 0x0C, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, isEmpty);
    expect(value.widgets, hasLength(1));
    expect(value.widgets.first.name, 'a');
    expect(value.widgets.first.initialState, isNull);
    expect(value.widgets.first.root, isA<ConstructorCall>());
    expect((value.widgets.first.root as ConstructorCall).name, 'b');
    expect(
      (value.widgets.first.root as ConstructorCall).arguments,
      hasLength(1),
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments.keys,
      <Object?>['c'],
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments['c'],
      hasLength(1),
    );
    expect(
      ((value.widgets.first.root as ConstructorCall).arguments['c']!
          as DynamicList)[0],
      isA<Loop>(),
    );
    expect(
      (((value.widgets.first.root as ConstructorCall).arguments['c']!
                  as DynamicList)[0]!
              as Loop)
          .input,
      isEmpty,
    );
    expect(
      (((value.widgets.first.root as ConstructorCall).arguments['c']!
                  as DynamicList)[0]!
              as Loop)
          .output,
      isA<ConstructorCall>(),
    );
    expect(
      ((((value.widgets.first.root as ConstructorCall).arguments['c']!
                          as DynamicList)[0]!
                      as Loop)
                  .output
              as ConstructorCall)
          .name,
      'd',
    );
    expect(
      ((((value.widgets.first.root as ConstructorCall).arguments['c']!
                          as DynamicList)[0]!
                      as Loop)
                  .output
              as ConstructorCall)
          .arguments,
      hasLength(1),
    );
    expect(
      ((((value.widgets.first.root as ConstructorCall).arguments['c']!
                          as DynamicList)[0]!
                      as Loop)
                  .output
              as ConstructorCall)
          .arguments['e'],
      isA<LoopReference>(),
    );
    expect(
      (((((value.widgets.first.root as ConstructorCall).arguments['c']!
                                  as DynamicList)[0]!
                              as Loop)
                          .output
                      as ConstructorCall)
                  .arguments['e']!
              as LoopReference)
          .loop,
      0,
    );
    expect(
      (((((value.widgets.first.root as ConstructorCall).arguments['c']!
                                  as DynamicList)[0]!
                              as Loop)
                          .output
                      as ConstructorCall)
                  .arguments['e']!
              as LoopReference)
          .parts,
      isEmpty,
    );
  });

  test('Library encoder: data references', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
        WidgetDeclaration(
          'a',
          null,
          ConstructorCall('b', <String, Object?>{
            'c': DataReference(<Object>['d']),
          }),
        ),
      ]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x62, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x63, 0x0B, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, isEmpty);
    expect(value.widgets, hasLength(1));
    expect(value.widgets.first.name, 'a');
    expect(value.widgets.first.initialState, isNull);
    expect(value.widgets.first.root, isA<ConstructorCall>());
    expect((value.widgets.first.root as ConstructorCall).name, 'b');
    expect(
      (value.widgets.first.root as ConstructorCall).arguments,
      hasLength(1),
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments.keys,
      <Object?>['c'],
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments['c'],
      isA<DataReference>(),
    );
    expect(
      ((value.widgets.first.root as ConstructorCall).arguments['c']!
              as DataReference)
          .parts,
      const <Object>['d'],
    );
  });

  test('Library encoder: state references', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
        WidgetDeclaration(
          'a',
          null,
          ConstructorCall('b', <String, Object?>{
            'c': StateReference(<Object>['d']),
          }),
        ),
      ]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x62, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x63, 0x0D, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, isEmpty);
    expect(value.widgets, hasLength(1));
    expect(value.widgets.first.name, 'a');
    expect(value.widgets.first.initialState, isNull);
    expect(value.widgets.first.root, isA<ConstructorCall>());
    expect((value.widgets.first.root as ConstructorCall).name, 'b');
    expect(
      (value.widgets.first.root as ConstructorCall).arguments,
      hasLength(1),
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments.keys,
      <Object?>['c'],
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments['c'],
      isA<StateReference>(),
    );
    expect(
      ((value.widgets.first.root as ConstructorCall).arguments['c']!
              as StateReference)
          .parts,
      const <Object>['d'],
    );
  });

  test('Library encoder: event handler', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
        WidgetDeclaration(
          'a',
          null,
          ConstructorCall('b', <String, Object?>{
            'c': EventHandler('d', <String, Object?>{}),
          }),
        ),
      ]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x62, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x63, 0x0E, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, isEmpty);
    expect(value.widgets, hasLength(1));
    expect(value.widgets.first.name, 'a');
    expect(value.widgets.first.initialState, isNull);
    expect(value.widgets.first.root, isA<ConstructorCall>());
    expect((value.widgets.first.root as ConstructorCall).name, 'b');
    expect(
      (value.widgets.first.root as ConstructorCall).arguments,
      hasLength(1),
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments.keys,
      <Object?>['c'],
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments['c'],
      isA<EventHandler>(),
    );
    expect(
      ((value.widgets.first.root as ConstructorCall).arguments['c']!
              as EventHandler)
          .eventName,
      'd',
    );
    expect(
      ((value.widgets.first.root as ConstructorCall).arguments['c']!
              as EventHandler)
          .eventArguments,
      isEmpty,
    );
  });

  test('Library encoder: state setter', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
        WidgetDeclaration(
          'a',
          null,
          ConstructorCall('b', <String, Object?>{
            'c': SetStateHandler(StateReference(<Object>['d']), false),
          }),
        ),
      ]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x62, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x63, 0x11, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64, 0x00,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, isEmpty);
    expect(value.widgets, hasLength(1));
    expect(value.widgets.first.name, 'a');
    expect(value.widgets.first.initialState, isNull);
    expect(value.widgets.first.root, isA<ConstructorCall>());
    expect((value.widgets.first.root as ConstructorCall).name, 'b');
    expect(
      (value.widgets.first.root as ConstructorCall).arguments,
      hasLength(1),
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments.keys,
      <Object?>['c'],
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments['c'],
      isA<SetStateHandler>(),
    );
    expect(
      ((value.widgets.first.root as ConstructorCall).arguments['c']!
              as SetStateHandler)
          .stateReference
          .parts,
      <Object>['d'],
    );
    expect(
      ((value.widgets.first.root as ConstructorCall).arguments['c']!
              as SetStateHandler)
          .value,
      false,
    );
  });

  test('Library encoder: switch', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
        WidgetDeclaration(
          'a',
          null,
          ConstructorCall('b', <String, Object?>{
            'c': Switch(false, <Object?, Object>{}),
          }),
        ),
      ]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x62, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x63, 0x0F, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, isEmpty);
    expect(value.widgets, hasLength(1));
    expect(value.widgets.first.name, 'a');
    expect(value.widgets.first.initialState, isNull);
    expect(value.widgets.first.root, isA<ConstructorCall>());
    expect((value.widgets.first.root as ConstructorCall).name, 'b');
    expect(
      (value.widgets.first.root as ConstructorCall).arguments,
      hasLength(1),
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments.keys,
      <Object?>['c'],
    );
    expect(
      (value.widgets.first.root as ConstructorCall).arguments['c'],
      isA<Switch>(),
    );
    expect(
      ((value.widgets.first.root as ConstructorCall).arguments['c']! as Switch)
          .input,
      false,
    );
    expect(
      ((value.widgets.first.root as ConstructorCall).arguments['c']! as Switch)
          .outputs,
      isEmpty,
    );
  });

  test('Library encoder: initial state', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
        WidgetDeclaration(
          'a',
          <String, Object?>{},
          ConstructorCall('b', <String, Object?>{}),
        ),
      ]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x62, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, isEmpty);
    expect(value.widgets, hasLength(1));
    expect(value.widgets.first.name, 'a');
    expect(value.widgets.first.initialState, isNull);
    expect(value.widgets.first.root, isA<ConstructorCall>());
    expect((value.widgets.first.root as ConstructorCall).name, 'b');
    expect((value.widgets.first.root as ConstructorCall).arguments, isEmpty);
  });

  test('Library encoder: initial state', () async {
    final Uint8List bytes = encodeLibraryBlob(
      const RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
        WidgetDeclaration('a', <String, Object?>{
          'b': false,
        }, ConstructorCall('c', <String, Object?>{})),
      ]),
    );
    // dart format off
    expect(bytes, <int>[
      0xFE, 0x43, 0x52, 0x46, 0x01, 0x00, 0x01, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  0x00, 0x62, 0x00, 0x09, 0x01, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x63, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    // dart format on
    final RemoteWidgetLibrary value = decodeLibraryBlob(bytes);
    expect(value.imports, isEmpty);
    expect(value.widgets, hasLength(1));
    expect(value.widgets.first.name, 'a');
    expect(value.widgets.first.initialState, isNotNull);
    expect(value.widgets.first.initialState, hasLength(1));
    expect(value.widgets.first.initialState!['b'], false);
    expect(value.widgets.first.root, isA<ConstructorCall>());
    expect((value.widgets.first.root as ConstructorCall).name, 'c');
    expect((value.widgets.first.root as ConstructorCall).arguments, isEmpty);
  });

  test('Library encoder: widget builders work', () async {
    const source = '''
      widget Foo = Builder(
        builder: (scope) => Text(text: scope.text),
      );
    ''';
    final RemoteWidgetLibrary library = parseLibraryFile(source);
    final Uint8List encoded = encodeLibraryBlob(library);
    final RemoteWidgetLibrary decoded = decodeLibraryBlob(encoded);

    expect(library.toString(), decoded.toString());
  });

  test('Library encoder: widget builders throws', () async {
    const remoteWidgetLibrary = RemoteWidgetLibrary(
      <Import>[],
      <WidgetDeclaration>[
        WidgetDeclaration(
          'a',
          <String, Object?>{},
          ConstructorCall('c', <String, Object?>{
            'builder': WidgetBuilderDeclaration(
              'scope',
              ArgsReference(<Object>[]),
            ),
          }),
        ),
      ],
    );
    try {
      decodeLibraryBlob(encodeLibraryBlob(remoteWidgetLibrary));
      fail('did not throw exception');
    } on FormatException catch (e) {
      expect(
        '$e',
        contains(
          'Unrecognized data type 0x0A while decoding widget builder blob.',
        ),
      );
    }
  });
}
