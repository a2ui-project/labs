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

// Binary format behavior that the shared cases can't state, because no source
// produces it.

import 'dart:typed_data';

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:a2ui_craft/model.dart';
import 'package:test/test.dart';

void main() {
  group('a missing value has no encoding', () {
    test('in a library', () {
      const library = RemoteWidgetLibrary(<Import>[], <WidgetDeclaration>[
        WidgetDeclaration(
          'root',
          null,
          ConstructorCall('Text', <String, Object?>{'text': missing}),
        ),
      ]);
      expect(() => encodeLibraryBlob(library), throwsStateError);
    });

    test('in data', () {
      expect(
        () => encodeDataBlob(<String, Object?>{'a': missing}),
        throwsStateError,
      );
    });

    test('control: the same values without missing encode', () {
      expect(encodeDataBlob(<String, Object?>{'a': 1}), isNotEmpty);
    });
  });

  group('decoded switch cases use the exact case equality', () {
    Switch decodeSwitch(String cases) {
      final Uint8List blob = encodeLibraryBlob(
        parseLibraryFile('widget a = switch args.x { $cases };'),
      );
      return decodeLibraryBlob(blob).widgets.single.root as Switch;
    }

    test('an integer and a double that is not exactly it stay distinct', () {
      // 2^53 + 1 == 2^53.0 in Dart, because the integer rounds to the double.
      final Switch value = decodeSwitch(
        '9007199254740993: A(), 9007199254740992.0: B()',
      );
      expect(value.outputs, hasLength(2));
      expect(value.outputs.keys.toList(), <Object?>[
        9007199254740993,
        9007199254740992.0,
      ]);
      expect(value.outputs.keys.last, isA<double>());
      expect((value.outputs[9007199254740993]! as ConstructorCall).name, 'A');
      expect((value.outputs[9007199254740992.0]! as ConstructorCall).name, 'B');
    });

    test('an integer and a double that is exactly it are the same case', () {
      final Switch value = decodeSwitch('9007199254740992: A(), 1: B()');
      expect((value.outputs[9007199254740992.0]! as ConstructorCall).name, 'A');
      expect((value.outputs[1.0]! as ConstructorCall).name, 'B');
    });
  });
}
