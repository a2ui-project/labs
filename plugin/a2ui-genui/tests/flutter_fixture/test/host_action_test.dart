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

import 'dart:async';

import 'package:a2ui_core/a2ui_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/assistant/app_catalog.dart';
import 'package:my_app/assistant/assistant_view.dart';
import 'package:my_app/assistant/chat_session.dart';
import 'package:my_app/assistant/llm_client.dart';

import 'fake_client.dart';

class HeldClient implements LlmClient {
  @override
  Stream<String> generate(String systemPrompt, List<ChatTurn> turns) =>
      StreamController<String>().stream;
}

Future<ChatSession> pump(WidgetTester tester, ChatSession session) async {
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
  return session;
}

Future<void> pressAdd(WidgetTester tester, ChatSession session) async {
  await session.send(readRecording('test/fixtures/recorded_turn.json').request);
  await tester.pump();
  final Finder add = find.widgetWithText(FilledButton, 'Add');
  await tester.ensureVisible(add);
  await tester.tap(add);
  await tester.pump();
}

void main() {
  final List<List<String>> replies = readRecording(
    'test/fixtures/recorded_turn.json',
  ).replies;

  testWidgets('one press runs the host action handler once, then the model '
      'turn', (tester) async {
    final List<String> handled = [];
    final ChatSession session = await pump(
      tester,
      ChatSession(
        client: FakeClient(replies),
        instructions: appInstructions,
        catalogs: [appCatalog],
        onAction: (A2uiRendererAction action) => handled.add(action.name),
      ),
    );
    await pressAdd(tester, session);

    expect(handled, ['addTask']);
    expect((session.client as FakeClient).requests, hasLength(2));
    expect(errorsOf(session), isEmpty);
  });

  testWidgets('a failed write shows as an error and does not go to the '
      'model', (tester) async {
    final ChatSession session = await pump(
      tester,
      ChatSession(
        client: FakeClient(replies),
        instructions: appInstructions,
        catalogs: [appCatalog],
        onAction: (_) => throw StateError('The write failed.'),
      ),
    );
    await pressAdd(tester, session);

    expect(errorsOf(session), [
      'The action failed: Bad state: The write failed.',
    ]);
    expect((session.client as FakeClient).requests, hasLength(1));
  });

  testWidgets('a reply that sends nothing ends as an error, and the session '
      'is no longer busy', (tester) async {
    final ChatSession session = await pump(
      tester,
      ChatSession(
        client: HeldClient(),
        instructions: appInstructions,
        catalogs: [appCatalog],
      ),
    );
    unawaited(session.send('Hello'));
    await tester.pump(const Duration(minutes: 4));
    expect(session.busy, isTrue);
    await tester.pump(const Duration(minutes: 1, seconds: 1));

    expect(session.busy, isFalse);
    expect(errorsOf(session), [
      'The request failed: TimeoutException after 0:05:00.000000: Future not '
          'completed',
    ]);
  });

  testWidgets('the send control is off while the session is busy', (
    tester,
  ) async {
    final reply = Completer<void>();
    final client = FakeClient(
      [
        ['Hi.'],
        ['Again.'],
      ],
      holds: {0: reply.future},
    );
    final ChatSession session = await pump(
      tester,
      ChatSession(
        client: client,
        instructions: appInstructions,
        catalogs: [appCatalog],
      ),
    );
    IconButton send() =>
        tester.widget(find.widgetWithIcon(IconButton, Icons.send));
    final Finder input = find.widgetWithText(TextField, 'Ask for some UI');
    await tester.enterText(input, 'One');
    await tester.tap(find.byTooltip('Send'));
    await tester.pump();
    expect(session.busy, isTrue);
    expect(send().onPressed, isNull);

    await tester.enterText(input, 'Two');
    await tester.tap(find.byTooltip('Send'), warnIfMissed: false);
    await tester.pump();
    expect(client.requests, hasLength(1));

    reply.complete();
    await tester.pump();
    expect(session.busy, isFalse);
    expect(send().onPressed, isNotNull);
    expect(errorsOf(session), isEmpty);
  });
}
