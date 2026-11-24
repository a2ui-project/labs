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

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/assistant/assistant_view.dart';
import 'package:my_app/assistant/chat_session.dart';

import 'fake_client.dart';

void main() {
  testWidgets('a2ui_agent 0.2.0 rejects root = <variable> in an update '
      'block, and the old root stays', (tester) async {
    final session = ChatSession(
      client: FakeClient([
        [
          '<a2ui>\nsurface("c")\nroot = Column([card, btn])\ncard = '
              'Card(Text("Old"))\nbtn = Button(t, "primary", Event("go"))\n'
              't = Text("Confirm")\n</a2ui>',
        ],
        [
          '<a2ui>\nsurface("c", update=true)\nroot = card\ncard = Card(row)\n'
              'row = Text("New")\n</a2ui>',
        ],
        ['Sorry.'],
      ]),
      instructions: '',
    );
    addTearDown(session.dispose);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AssistantView(
            session: session,
            apiKey: ValueNotifier('test-key'),
          ),
        ),
      ),
    );
    await session.send('One');
    await session.send('Two');
    await tester.pump();

    expect(errorsOf(session), [
      'UNKNOWN_ERROR on "": \'root\' must be assigned a component.',
    ]);
    expect(find.text('Old'), findsOne);
    expect(find.widgetWithText(FilledButton, 'Confirm'), findsOne);
  });
}
