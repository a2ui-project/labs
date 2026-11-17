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
import 'dart:convert';

import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/assistant/app_actions.dart';
import 'package:my_app/assistant/app_catalog.dart';
import 'package:my_app/assistant/chat_session.dart';
import 'package:my_app/standing.dart';
import 'package:my_app/tasks.dart';

import 'fake_client.dart';

// The model writes 3 for the count; the host's value must win.
const sidebarSome = [
  '<a2ui>\nsurface("sidebar-1")\n\$/context/selected_count = 3\nroot = Card(',
  'col)\ncol = Column([t, n, b])\nt = Text("Selected items")\nn = Text(\$/con',
  'text/selected_count)\nb = Button(bt, "primary", Event("pin", {count: \$/co',
  'ntext/selected_count}))\nbt = Text("Pin selection")\n</a2ui>',
];
const sidebarNone = [
  '<a2ui>\nsurface("sidebar-2")\nroot = Card(Text("Select items to see actio',
  'ns"))\n</a2ui>',
];
const pinned = [
  'Pinned.\n\n<a2ui>\nsurface("sidebar-1", update=true)\nt = Text("Pinned")\n',
  '</a2ui>',
];
const homePin = [
  '<a2ui>\nsurface("home-1")\nroot = Card(col)\ncol = Column([t, b])\nt = Text(',
  '\$/today)\nb = Button(bt, "primary", Event("pin", {count: \$/selected_count',
  '}))\nbt = Text("Pin selection")\n</a2ui>',
];
List<String> homeReply(String surfaceId) => [
  '<a2ui>\nsurface("$surfaceId")\nroot = Card(col)\ncol = Column([d, n])\n',
  'd = Text(\$/today)\nn = Text(\$/selected_count)\n</a2ui>',
];

late TaskStore store;

Finder panel() => find.bySemanticsLabel('Assistant panel');
Finder home() => find.bySemanticsLabel('Today');
Finder inside(Finder container, Finder matching) =>
    find.descendant(of: container, matching: matching);
Finder surfaceText(Finder container, String text) => inside(
  container,
  find.descendant(of: find.byType(A2uiSurface), matching: find.text(text)),
);

ChatSession newSession(FakeClient client) {
  final session = ChatSession(
    client: client,
    instructions: appInstructions,
    catalogs: [appCatalog],
    onAction: appActions(store),
  );
  addTearDown(session.dispose);
  return session;
}

Future<ChatSession> pumpList(WidgetTester tester, FakeClient client) async {
  final ChatSession session = newSession(client);
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: ListScreen(
          session: session,
          store: store,
          apiKey: ValueNotifier('test-key'),
        ),
      ),
    ),
  );
  return session;
}

Future<ChatSession> pumpApp(
  WidgetTester tester,
  FakeClient client, {
  DateTime Function()? now,
  String? key = 'test-key',
}) async {
  final ChatSession session = newSession(client);
  await tester.pumpWidget(
    FixtureApp(
      session: session,
      store: store,
      apiKey: ValueNotifier(key),
      now: now ?? () => DateTime(2026, 11, 13, 12),
    ),
  );
  await tester.pump();
  return session;
}

// Not pumpAndSettle: it runs fake time on to the reply timeout of a held
// reply.
Future<void> openPanel(WidgetTester tester) async {
  await tester.tap(find.text('Assistant'));
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
}

Future<void> closePanel(WidgetTester tester) async {
  await tester.tapAt(const Offset(10, 10));
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
}

Finder busy(Finder container) =>
    inside(container, find.byType(LinearProgressIndicator));

void main() {
  setUp(() => store = TaskStore()..selected.value = {'Water plants'});

  testWidgets('A: the panel makes one request when it first shows, none '
      'when the sheet opens again, and the request is the host-built '
      'string', (tester) async {
    final client = FakeClient([sidebarSome]);
    final ChatSession session = await pumpList(tester, client);
    await openPanel(tester);
    expect(surfaceText(panel(), 'Selected items'), findsOne);
    expect(busy(panel()), findsNothing);

    await closePanel(tester);
    expect(panel(), findsNothing);
    await openPanel(tester);
    expect(surfaceText(panel(), 'Selected items'), findsOne);
    expect(client.requests, hasLength(1));
    expect(
      client.requests.single.single.text,
      sidebarRequest('some', 'sidebar-1'),
    );
    expect(session.errors, isEmpty);
  });

  testWidgets('B: a selection change inside the context key reaches the '
      'surface as data, with no request; the host value wins over the '
      "model's", (tester) async {
    store.tasks.add(const Task('Buy milk'));
    final client = FakeClient([sidebarSome]);
    final ChatSession session = await pumpList(tester, client);
    await openPanel(tester);
    expect(surfaceText(panel(), '1'), findsOne);
    expect(surfaceText(panel(), '3'), findsNothing);

    store.selected.value = {'Water plants', 'Buy milk'};
    await tester.pump();
    expect(surfaceText(panel(), '2'), findsOne);
    expect(surfaceText(panel(), 'Selected items'), findsOne);
    expect(client.requests, hasLength(1));
    expect(session.errors, isEmpty);
  });

  testWidgets('C: a new context key gives one request, and the new surface '
      'replaces the old one', (tester) async {
    final client = FakeClient([sidebarSome, sidebarNone]);
    final ChatSession session = await pumpList(tester, client);
    await openPanel(tester);
    expect(surfaceText(panel(), 'Selected items'), findsOne);

    store.selected.value = {};
    await tester.pump();
    expect(surfaceText(panel(), 'Select items to see actions'), findsOne);
    expect(find.text('Selected items'), findsNothing);
    expect(find.byType(A2uiSurface), findsOne);
    expect(session.processor.model.getSurface('sidebar-1'), isNull);
    expect(busy(panel()), findsNothing);
    expect(client.requests, hasLength(2));
    // A new generation starts from its request alone.
    expect(client.requests[1].single.text, sidebarRequest('none', 'sidebar-2'));
    expect(session.errors, isEmpty);
  });

  testWidgets('D: a press on the panel runs the write handler once, and the '
      'answer updates the panel from its own history', (tester) async {
    final client = FakeClient([sidebarSome, pinned]);
    final ChatSession session = await pumpList(tester, client);
    await openPanel(tester);
    await tapOn(tester, inside(panel(), find.text('Pin selection')));

    expect(store.pins.value, 1);
    expect(find.text('Pins: 1'), findsOne);
    expect(surfaceText(panel(), 'Pinned'), findsOne);
    expect(client.requests, hasLength(2));
    final List<ChatTurn> turns = client.requests[1];
    expect(turns.map((turn) => turn.fromUser), [true, false, true]);
    expect(turns.first.text, sidebarRequest('some', 'sidebar-1'));
    expect((jsonDecode(turns.last.text) as Map<String, Object?>)['a2ui'], {
      'messages': [
        {
          'version': '1.0',
          'action': allOf(
            containsPair('name', 'pin'),
            containsPair('surfaceId', 'sidebar-1'),
            containsPair('context', {'count': 1}),
          ),
        },
      ],
    });
    // The conversation saw none of it.
    expect(session.entries, isEmpty);
    expect(session.errors, isEmpty);
  });

  testWidgets('E: the home region makes one request with the date of the '
      'clock, keeps the app content until the surface is complete, makes '
      'none after navigation, and shows a data change', (tester) async {
    final reply = Completer<void>();
    final client = FakeClient([homeReply('home-1')], holds: {0: reply.future});
    store.selected.value = {};
    final ChatSession session = await pumpApp(tester, client);
    expect(inside(home(), find.text('Welcome back. 0 selected.')), findsOne);
    expect(busy(home()), findsOne);

    reply.complete();
    await tester.pump();
    expect(surfaceText(home(), '2026-11-13'), findsOne);
    expect(surfaceText(home(), '0'), findsOne);
    expect(find.textContaining('Welcome back.'), findsNothing);
    expect(busy(home()), findsNothing);

    await tester.tap(find.text('Tasks'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Water plants'));
    await tester.pump();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(surfaceText(home(), '1'), findsOne);
    expect(surfaceText(home(), '2026-11-13'), findsOne);
    expect(client.requests, hasLength(1));
    expect(
      client.requests.single.single.text,
      homeRequest('2026-11-13', 'home-1'),
    );
    expect(session.errors, isEmpty);
  });

  testWidgets('F: a failed reply shows one retry control and keeps the app '
      'content; retry gives the surface', (tester) async {
    store.selected.value = {};
    final client = FakeClient([[], homeReply('home-2')]);
    final ChatSession session = await pumpApp(tester, client);
    expect(inside(home(), find.text('The model gave no reply.')), findsOne);
    expect(inside(home(), find.text('Retry')), findsOne);
    expect(inside(home(), find.text('Welcome back. 0 selected.')), findsOne);
    expect(busy(home()), findsNothing);

    await tester.tap(inside(home(), find.text('Retry')));
    await tester.pump();
    expect(surfaceText(home(), '2026-11-13'), findsOne);
    expect(find.text('Retry'), findsNothing);
    expect(client.requests, hasLength(2));
    expect(client.requests[1].single.text, homeRequest('2026-11-13', 'home-2'));
    expect(session.errors, ['The model gave no reply.']);
  });

  testWidgets('G: an answer under another surface id is never shown and goes '
      'back to the model as an error; the corrected answer shows', (
    tester,
  ) async {
    final client = FakeClient([
      ['<a2ui>\nroot = Card(Text("Wrong id"))\n</a2ui>'],
      sidebarSome,
    ]);
    final ChatSession session = await pumpList(tester, client);
    await openPanel(tester);

    expect(find.text('Wrong id'), findsNothing);
    expect(session.processor.model.getSurface('default_surface'), isNull);
    expect(surfaceText(panel(), 'Selected items'), findsOne);
    const error =
        'Draw into the surface "sidebar-1": start the block with '
        'surface("sidebar-1").';
    expect(session.errors, ['UNKNOWN_ERROR on "default_surface": $error']);
    final List<ChatTurn> turns = client.requests[1];
    expect(turns.map((turn) => turn.fromUser), [true, false, true]);
    expect(jsonDecode(turns.last.text), {
      'a2ui': {
        'messages': [
          {
            'version': '1.0',
            'error': {
              'code': 'UNKNOWN_ERROR',
              'surfaceId': 'default_surface',
              'message': error,
            },
          },
        ],
      },
    });
    expect(client.requests, hasLength(2));
  });

  testWidgets('H: a reply that ends for a context key that is no longer '
      'current is dropped, and one generation starts for the current key', (
    tester,
  ) async {
    final reply = Completer<void>();
    final client = FakeClient(
      [sidebarSome, sidebarNone],
      holds: {0: reply.future},
    );
    final ChatSession session = await pumpList(tester, client);
    await openPanel(tester);
    expect(busy(panel()), findsOne);

    store.selected.value = {};
    await tester.pump();
    expect(client.requests, hasLength(1));
    reply.complete();
    await tester.pump();

    expect(surfaceText(panel(), 'Select items to see actions'), findsOne);
    expect(find.text('Selected items'), findsNothing);
    expect(session.processor.model.getSurface('sidebar-1'), isNull);
    expect(session.slot('sidebar').surface?.id, 'sidebar-2');
    expect(busy(panel()), findsNothing);
    expect(client.requests, hasLength(2));
    expect(client.requests[1].single.text, sidebarRequest('none', 'sidebar-2'));
    expect(session.errors, isEmpty);
  });

  testWidgets('I: after 2 error turns in a row the panel shows its error '
      'state with one retry control, and retry starts a new generation', (
    tester,
  ) async {
    const wrong = ['<a2ui>\nroot = Card(Text("Wrong id"))\n</a2ui>'];
    final client = FakeClient([
      wrong,
      wrong,
      wrong,
      [sidebarSome.join().replaceFirst('sidebar-1', 'sidebar-2')],
    ]);
    final ChatSession session = await pumpList(tester, client);
    await openPanel(tester);

    expect(client.requests, hasLength(3));
    expect(client.requests[2].map((turn) => turn.fromUser), [
      true,
      false,
      true,
      false,
      true,
    ]);
    expect(find.text('Wrong id'), findsNothing);
    expect(
      inside(panel(), find.text('The model did not correct the surface.')),
      findsOne,
    );
    expect(inside(panel(), find.text('Retry')), findsOne);
    expect(busy(panel()), findsNothing);

    await tester.tap(inside(panel(), find.text('Retry')));
    await tester.pump();
    expect(surfaceText(panel(), 'Selected items'), findsOne);
    expect(find.text('Retry'), findsNothing);
    expect(client.requests, hasLength(4));
    expect(client.requests[3].single.text, sidebarRequest('some', 'sidebar-2'));
    expect(session.errors.last, 'The model did not correct the surface.');
  });

  testWidgets('J: in the full app, the panel opens as a sheet from the list '
      'screen, and a selection change through the data gives one new '
      'request', (tester) async {
    final client = FakeClient([homeReply('home-1'), sidebarSome, sidebarNone]);
    final ChatSession session = await pumpApp(tester, client);
    await tester.tap(find.text('Tasks'));
    await tester.pumpAndSettle();
    await openPanel(tester);
    expect(surfaceText(panel(), 'Selected items'), findsOne);
    expect(client.requests, hasLength(2));
    expect(client.requests[1].single.text, sidebarRequest('some', 'sidebar-1'));

    // The modal sheet blocks taps on the list behind it.
    store.selected.value = {};
    await tester.pump();
    expect(surfaceText(panel(), 'Select items to see actions'), findsOne);
    expect(client.requests, hasLength(3));
    expect(session.errors, isEmpty);
  });

  testWidgets('K: a cut-off answer is removed, the old surface stays, and '
      'the panel shows its error state with one retry control', (tester) async {
    final client = FakeClient(
      [
        sidebarSome,
        [sidebarNone.first],
        [sidebarNone.join().replaceFirst('sidebar-2', 'sidebar-3')],
      ],
      cuts: {2},
    );
    final ChatSession session = await pumpList(tester, client);
    await openPanel(tester);

    void expectOldSurface(String newId) {
      expect(surfaceText(panel(), 'Selected items'), findsOne);
      expect(find.textContaining('Select items'), findsNothing);
      expect(session.processor.model.getSurface(newId), isNull);
      expect(session.slot('sidebar').surface?.id, 'sidebar-1');
      expect(inside(panel(), find.text('Retry')), findsOne);
      expect(busy(panel()), findsNothing);
    }

    // The stream ends in the middle of the block.
    store.selected.value = {};
    await tester.pump();
    expectOldSurface('sidebar-2');
    expect(client.requests, hasLength(2));

    // The client throws after the first chunk.
    await tester.tap(inside(panel(), find.text('Retry')));
    await tester.pump();
    expectOldSurface('sidebar-3');
    expect(client.requests, hasLength(3));
    expect(session.errors, [
      'The reply ended inside its block.',
      'The request failed: Bad state: The reply was cut off.',
    ]);
  });

  testWidgets('L: when the date changes, the home region makes one new '
      'request with the new date when it shows again or the app resumes', (
    tester,
  ) async {
    var now = DateTime(2026, 11, 13, 23, 59);
    final client = FakeClient([
      homeReply('home-1'),
      homeReply('home-2'),
      homeReply('home-3'),
    ]);
    final ChatSession session = await pumpApp(tester, client, now: () => now);
    await tester.tap(find.text('Tasks'));
    await tester.pumpAndSettle();
    now = DateTime(2026, 11, 14, 0, 1);
    await tester.pageBack();
    await tester.pumpAndSettle();

    expect(client.requests, hasLength(2));
    expect(client.requests[1].single.text, homeRequest('2026-11-14', 'home-2'));
    expect(surfaceText(home(), '2026-11-14'), findsOne);
    expect(session.processor.model.getSurface('home-1'), isNull);

    now = DateTime(2026, 11, 15, 8);
    for (final AppLifecycleState state in [
      AppLifecycleState.inactive,
      AppLifecycleState.hidden,
      AppLifecycleState.paused,
      AppLifecycleState.hidden,
      AppLifecycleState.inactive,
      AppLifecycleState.resumed,
    ]) {
      tester.binding.handleAppLifecycleStateChanged(state);
    }
    await tester.pump();
    expect(client.requests, hasLength(3));
    expect(client.requests[2].single.text, homeRequest('2026-11-15', 'home-3'));
    expect(session.errors, isEmpty);
  });

  testWidgets('M: a press on the home surface runs the write handler once, '
      'and the follow-up uses the history of the home target', (tester) async {
    final client = FakeClient([
      homePin,
      [
        for (final String chunk in pinned)
          chunk.replaceFirst('sidebar-1', 'home-1'),
      ],
    ]);
    final ChatSession session = await pumpApp(tester, client);
    await tapOn(tester, inside(home(), find.text('Pin selection')));

    expect(store.pins.value, 1);
    expect(surfaceText(home(), 'Pinned'), findsOne);
    expect(client.requests, hasLength(2));
    final List<ChatTurn> turns = client.requests[1];
    expect(turns.map((turn) => turn.fromUser), [true, false, true]);
    expect(turns.first.text, homeRequest('2026-11-13', 'home-1'));
    expect(turns[1].text, homePin.join());
    expect((jsonDecode(turns.last.text) as Map<String, Object?>)['a2ui'], {
      'messages': [
        {
          'version': '1.0',
          'action': allOf(
            containsPair('name', 'pin'),
            containsPair('surfaceId', 'home-1'),
            containsPair('context', {'count': 1}),
          ),
        },
      ],
    });
    expect(session.entries, isEmpty);
    expect(session.errors, isEmpty);
  });

  testWidgets('N: with no key, each container shows the app content and one '
      'control that opens the key entry, no request goes out, and the send '
      'control is off; a saved key starts the home generation', (tester) async {
    final client = FakeClient([homeReply('home-1')]);
    await pumpApp(tester, client, key: null);
    expect(inside(home(), find.text('Welcome back. 1 selected.')), findsOne);
    expect(inside(home(), find.text('Add a key')), findsOne);
    expect(busy(home()), findsNothing);

    await tester.tap(find.text('Tasks'));
    await tester.pumpAndSettle();
    await openPanel(tester);
    expect(
      inside(panel(), find.text('The assistant is getting ready.')),
      findsOne,
    );
    expect(inside(panel(), find.text('Add a key')), findsOne);
    expect(busy(panel()), findsNothing);
    await closePanel(tester);
    await tester.pageBack();
    await tester.pumpAndSettle();

    await tester.tap(find.text('Chat'));
    await tester.pumpAndSettle();
    IconButton send() =>
        tester.widget(find.widgetWithIcon(IconButton, Icons.send));
    expect(find.text('Add a key'), findsOne);
    expect(send().onPressed, isNull);
    expect(client.requests, isEmpty);

    await tester.tap(find.text('Add a key'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, 'API key'), 'k');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(find.text('Add a key'), findsNothing);
    expect(send().onPressed, isNotNull);
    expect(client.requests, hasLength(1));
    expect(
      client.requests.single.single.text,
      homeRequest('2026-11-13', 'home-1'),
    );
  });

  testWidgets('O: a held reply on a standing target ends in the error state '
      'with one retry control after the reply timeout', (tester) async {
    store.selected.value = {};
    final client = FakeClient(
      [homeReply('home-1')],
      holds: {0: Completer<void>().future},
    );
    final ChatSession session = await pumpApp(tester, client);
    await tester.pump(const Duration(minutes: 4));
    expect(busy(home()), findsOne);
    await tester.pump(const Duration(minutes: 1, seconds: 1));

    expect(inside(home(), find.text('Retry')), findsOne);
    expect(inside(home(), find.text('Welcome back. 0 selected.')), findsOne);
    expect(busy(home()), findsNothing);
    expect(session.errors, [
      'The request failed: TimeoutException after 0:05:00.000000: Future not '
          'completed',
    ]);
  });

  testWidgets('P: a generation queued for an old context key never starts', (
    tester,
  ) async {
    final reply = Completer<void>();
    final client = FakeClient(
      [
        sidebarSome,
        [sidebarNone.join().replaceFirst('sidebar-2', 'sidebar-3')],
      ],
      holds: {0: reply.future},
    );
    final ChatSession session = newSession(client);
    session.show('sidebar', 'a', (id) => sidebarRequest('a', id));
    await tester.pump();
    for (final String key in ['b', 'c']) {
      session.show('sidebar', key, (id) => sidebarRequest(key, id));
    }
    await tester.pump();
    expect(client.requests, hasLength(1));

    reply.complete();
    await tester.pump();
    expect(client.requests, hasLength(2));
    expect(client.requests[1].single.text, sidebarRequest('c', 'sidebar-3'));
    expect(session.slot('sidebar').surface?.id, 'sidebar-3');
    expect(session.processor.model.getSurface('sidebar-1'), isNull);
    expect(session.busy, isFalse);
    expect(session.errors, isEmpty);
  });
}
