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

// A host imports Craft next to the Material and Cupertino libraries without
// hiding names. Dart reports a clash only for a name a file uses, so this file
// uses `Switch`, the name the library model shares with Material.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:a2ui_craft_flutter/a2ui_craft_flutter.dart';
import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  testWidgets('Craft and Flutter libraries import together', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Material(
          child: Column(
            children: <Widget>[
              Switch(value: true, onChanged: (_) {}),
              CupertinoSwitch(value: true, onChanged: (_) {}),
            ],
          ),
        ),
      ),
    );
    expect(coreLibrary, const LibraryName(<String>['core']));
    expect(MediaSource.values, isNotEmpty);
  });
}
