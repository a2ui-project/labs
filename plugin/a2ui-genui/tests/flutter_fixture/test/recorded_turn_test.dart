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

import 'dart:convert';

import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/assistant/app_actions.dart';
import 'package:my_app/assistant/app_catalog.dart';
import 'package:my_app/assistant/app_tools.dart';
import 'package:my_app/assistant/assistant_view.dart';
import 'package:my_app/assistant/chat_session.dart';
import 'package:my_app/tasks.dart';

import 'fake_client.dart';

final recording = readRecording('test/fixtures/recorded_turn.json');

Future<ChatSession> pumpSession(
  WidgetTester tester,
  List<List<String>> replies,
) async {
  final session = ChatSession(
    client: FakeClient(replies),
    instructions: appInstructions,
    catalogs: [appCatalog],
    onAction: appActions(data),
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
  return session;
}

Future<void> ask(WidgetTester tester, String request) async {
  await tester.enterText(
    find.widgetWithText(TextField, 'Ask for some UI'),
    request,
  );
  await tester.tap(find.byTooltip('Send'));
  await tester.pump();
}

FakeClient clientOf(ChatSession session) => session.client as FakeClient;

// The app's data, built as the app's own tests build it, again for each test
// in setUp: a write in one test must not change what the next test reads.
late TaskStore data;

// Calls a read tool with no model, as the model client does. The replay never
// runs it. Call it before a surface with network images is pumped: runAsync
// then fails under load.
Future<Object?> runTool(
  WidgetTester tester,
  String name, [
  Map<String, dynamic> args = const {},
]) => tester.runAsync<Object?>(
  () => readTools(data).firstWhere((tool) => tool.name == name).call(args),
);

// A basic Button is a FilledButton only for the variant "primary".
Finder button(String label) => find.ancestor(
  of: find.text(label),
  matching: find.bySubtype<ButtonStyleButton>(),
);

Finder onSurface(Finder matching) =>
    find.descendant(of: find.byType(A2uiSurface), matching: matching);

void main() {
  setUp(() => data = TaskStore());

  testWidgets('a surface shows an app component beside basic components', (
    tester,
  ) async {
    final tasks = (await runTool(tester, 'listTasks'))! as List<Object?>;
    final ChatSession session = await pumpSession(tester, recording.replies);
    await ask(tester, recording.request);

    expect(
      clientOf(session).systemPrompts.single,
      contains('StatusBadge(label, status (static))'),
    );
    expect(find.text('Here is a form for your new task.'), findsOne);
    // The app's data is asserted against the read tool, not copied from the
    // recording.
    for (final Object? task in tasks) {
      final String title = (task! as Map<String, Object?>)['title']! as String;
      expect(onSurface(find.widgetWithText(Chip, title)), findsOne);
    }
    expect(onSurface(find.widgetWithText(TextField, 'Title')), findsOne);
    expect(onSurface(button('Add')), findsOne);
    expect(errorsOf(session), isEmpty);
  });

  testWidgets('an action goes to the model and its reply updates the surface', (
    tester,
  ) async {
    final ChatSession session = await pumpSession(tester, recording.replies);
    await ask(tester, recording.request);

    await tester.enterText(
      onSurface(find.widgetWithText(TextField, 'Title')),
      'Buy milk',
    );
    await tester.pump();
    await tapOn(tester, onSurface(button('Add')));

    final List<List<ChatTurn>> requests = clientOf(session).requests;
    expect(requests, hasLength(2));
    expect(requests[1].map((turn) => turn.fromUser), [true, false, true]);
    expect(jsonDecode(requests[1].last.text), {
      'a2ui': {
        'messages': [
          {
            'version': '1.0',
            'action': {
              'name': 'addTask',
              'surfaceId': 'new-task',
              'sourceComponentId': 'addBtn',
              'timestamp': isA<String>(),
              'context': {'title': 'Buy milk'},
            },
          },
        ],
      },
      'metadata': {
        'a2uiRendererDataModel': {
          'version': '1.0',
          'surfaces': {
            'new-task': {'title': 'Buy milk'},
          },
        },
      },
    });
    // The write's effect in the app's data: one press, one write.
    expect(data.tasks.where((task) => task.title == 'Buy milk'), hasLength(1));
    expect(onSurface(find.text('Task added')), findsOne);
    expect(onSurface(find.widgetWithText(Chip, 'Buy milk')), findsOne);
    expect(find.widgetWithText(TextField, 'Title'), findsNothing);
    expect(errorsOf(session), isEmpty);
  });

  testWidgets('the read tool returns the data of the app', (tester) async {
    expect(await runTool(tester, 'listTasks'), [
      for (final Task task in data.tasks)
        {'title': task.title, 'done': task.done},
    ]);
  });

  testWidgets('a second answer without a surface line goes back as an '
      'error, and the corrected answer adds a surface', (tester) async {
    const request = 'Show my open tasks.';
    final ChatSession session = await pumpSession(tester, [
      [
        'Here are your open tasks.\n\n<a2ui>\nroot = Text("No open tasks.")\n'
            '</a2ui>',
      ],
      [
        'Here they are again.\n\n<a2ui>\nroot = Text(',
        '"Still no open tasks.")\n</a2ui>',
      ],
      [
        'Sorry, here they are on a new surface.\n\n<',
        'a2ui>\nsurface("open-tasks")\nroot = Text("',
        'Still no open tasks.")\n</a2ui>',
      ],
    ]);
    await ask(tester, request);
    await ask(tester, request);

    expect(errorsOf(session), [
      'INTEGRITY_ERROR on "": Surface default_surface already exists.',
    ]);
    final List<List<ChatTurn>> requests = clientOf(session).requests;
    expect(requests, hasLength(3));
    expect(jsonDecode(requests[2].last.text), {
      'a2ui': {
        'messages': [
          {
            'version': '1.0',
            'error': {
              'code': 'INTEGRITY_ERROR',
              'surfaceId': '',
              'message': 'Surface default_surface already exists.',
            },
          },
        ],
      },
    });
    expect(
      [
        for (final ChatEntry entry in session.entries)
          '${entry.kind.name} ${entry.surface?.id ?? entry.text}',
      ],
      [
        'user $request',
        'model Here are your open tasks.',
        'surface default_surface',
        'user $request',
        'model Here they are again.',
        'error ${errorsOf(session).single}',
        'sent error INTEGRITY_ERROR',
        'model Sorry, here they are on a new surface.',
        'surface open-tasks',
      ],
    );
    expect(onSurface(find.text('No open tasks.')), findsOne);
    expect(onSurface(find.text('Still no open tasks.')), findsOne);
  });

  testWidgets('a rejected block shows as an error between the text before '
      'and after it', (tester) async {
    final ChatSession session = await pumpSession(tester, [
      [
        'Here is the status.\n\n<a2ui>\nsurface("stat',
        'us")\nroot = Text("Buy milk", "hu',
        'ge")\n</a2ui>\n\nAnything else?',
      ],
      ['Sorry, that text style does not exist.'],
    ]);
    await ask(tester, 'Show the status of my task.');

    expect(find.text('Here is the status.'), findsOne);
    expect(find.text('Anything else?'), findsOne);
    expect(find.byType(A2uiSurface), findsNothing);
    expect(errorsOf(session), [
      startsWith(
        'VALIDATION_FAILED on "": Component \'root\' does not match the '
        '\'Text\' schema',
      ),
    ]);
    expect(find.text(errorsOf(session).single), findsOne);
    final List<List<ChatTurn>> requests = clientOf(session).requests;
    expect(requests, hasLength(2));
    expect(jsonDecode(requests[1].last.text), {
      'a2ui': {
        'messages': [
          {
            'version': '1.0',
            'error': allOf(
              containsPair('code', 'VALIDATION_FAILED'),
              containsPair('surfaceId', ''),
              containsPair('path', '/variant'),
            ),
          },
        ],
      },
    });
    expect(find.text('Sorry, that text style does not exist.'), findsOne);
  });
}
