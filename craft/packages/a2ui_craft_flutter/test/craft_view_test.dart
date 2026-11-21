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

// Widget tests of CraftView with a tiny test-only primitive library: it
// renders the expansion, forwards events and errors, and follows the
// runtime's changes.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:a2ui_craft_flutter/a2ui_craft_flutter.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

const LibraryName _main = LibraryName(<String>['main']);

/// Text shows a value; Button is a tappable child, disabled without a
/// handler; Field fires its handler with a value; List builds `count` items
/// with its builder.
final PrimitiveWidgetLibrary _testWidgets = PrimitiveWidgetLibrary(
  <String, PrimitiveWidget>{
    'Column': PrimitiveWidget(
      (BuildContext context, PrimitiveArguments args) =>
          Column(children: args.children('children')),
    ),
    'Row': PrimitiveWidget(
      (BuildContext context, PrimitiveArguments args) =>
          Row(children: args.children('children')),
    ),
    'Text': PrimitiveWidget(
      (BuildContext context, PrimitiveArguments args) =>
          Text(switch (args['text']) {
            Missing() => '',
            final Object value => '$value',
          }),
    ),
    'Button': PrimitiveWidget(
      (BuildContext context, PrimitiveArguments args) => GestureDetector(
        key: switch (args.value<String>('key')) {
          final String key => ValueKey<String>(key),
          null => null,
        },
        onTap: args.handler('onPressed'),
        child: args.child('child') ?? const SizedBox(),
      ),
    ),
    'Field': PrimitiveWidget(
      (BuildContext context, PrimitiveArguments args) =>
          _Field(onChanged: args.valueHandler('onChanged')),
    ),
    'List': PrimitiveWidget(
      (BuildContext context, PrimitiveArguments args) => Column(
        children: <Widget>[
          for (int i = 0; i < (args.value<int>('count') ?? 0); i += 1)
            args.builder('builder')!(i, <String, Object?>{'index': i}),
        ],
      ),
    ),
  },
);

class _Field extends StatelessWidget {
  const _Field({required this.onChanged});

  final ValueChanged<Object?>? onChanged;

  @override
  Widget build(BuildContext context) => const SizedBox();
}

class _Harness {
  _Harness(String source, {Object? data, Map<String, Object?>? args}) {
    registry
      ..setPrimitiveLibrary(coreLibrary, _testWidgets)
      ..setTemplateLibrary(_main, parseLibraryFile(source));
    runtime = CraftRuntime(
      registry,
      library: _main,
      widget: 'root',
      args: args ?? const <String, Object?>{},
      data: data,
    );
  }

  final TemplateRegistry registry = TemplateRegistry();
  late final CraftRuntime runtime;
  final List<HostEvent> events = <HostEvent>[];
  final List<Object> errors = <Object>[];

  Widget view({
    Map<LibraryName, PrimitiveWidgetLibrary>? libraries,
    Widget Function(BuildContext context, HostWidgetNode node)?
    hostWidgetBuilder,
  }) => Directionality(
    textDirection: TextDirection.ltr,
    child: CraftView(
      runtime: runtime,
      libraries:
          libraries ??
          <LibraryName, PrimitiveWidgetLibrary>{coreLibrary: _testWidgets},
      onEvent: events.add,
      onError: errors.add,
      hostWidgetBuilder: hostWidgetBuilder,
    ),
  );
}

void main() {
  testWidgets('renders the expansion with the primitive widgets', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness('''
      import core;
      widget Label = Text(text: args.t);
      widget root = Column(children: [Label(t: "a"), Row(children: [Label(t: 1), absent])]);
    ''');
    await tester.pumpWidget(h.view());
    expect(find.text('a'), findsOneWidget);
    expect(find.text('1'), findsOneWidget);
    expect(
      find.descendant(of: find.byType(Row), matching: find.byType(Text)),
      findsOneWidget,
      reason: 'an absent element is no child',
    );
    expect(h.errors, isEmpty);
  });

  testWidgets('host widget nodes render through the host', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness(
      '''
      import core;
      widget root = Column(children: [args.first, Button(child: args.second), ...for w in args.rest: w]);
    ''',
      args: <String, Object?>{
        'first': const HostWidget('a'),
        'second': const HostWidget('b'),
        'rest': <Object?>[const HostWidget('c')],
      },
    );
    await tester.pumpWidget(
      h.view(
        hostWidgetBuilder: (BuildContext context, HostWidgetNode node) =>
            Text('host ${node.id} at ${node.path.join('.')}'),
      ),
    );
    expect(find.text('host a at children.0'), findsOneWidget);
    expect(find.text('host b at children.1.child'), findsOneWidget);
    expect(find.text('host c at children.2'), findsOneWidget);

    await tester.pumpWidget(h.view());
    expect(find.byType(Text), findsNothing);
    expect(h.errors, isEmpty);
  });

  testWidgets('a tap fires the handler and the view follows the state', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness('''
      import core;
      widget root { count: 0 } = Column(children: [
        Text(text: state.count),
        Button(key: "inc", onPressed: set state.count = add(a: state.count, b: 1), child: Text(text: "+")),
      ]);
    ''');
    await tester.pumpWidget(h.view());
    expect(find.text('0'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey<String>('inc')));
    await tester.pump();
    expect(find.text('1'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey<String>('inc')));
    await tester.pump();
    expect(find.text('2'), findsOneWidget);
  });

  testWidgets('events and host handlers go to the host', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness(
      '''
      import core;
      widget root = Column(children: [
        Button(key: "go", onPressed: [event "pressed" { id: 1 }, args.action], child: Text(text: "go")),
        Field(onChanged: event "changed" {}),
      ]);
    ''',
      args: <String, Object?>{'action': const HostHandler('approve')},
    );
    await tester.pumpWidget(h.view());
    await tester.tap(find.byKey(const ValueKey<String>('go')));
    tester.widget<_Field>(find.byType(_Field)).onChanged!('typed');
    expect(h.events, hasLength(3));
    expect(
      h.events[0],
      isA<TemplateEvent>()
          .having((TemplateEvent e) => e.name, 'name', 'pressed')
          .having(
            (TemplateEvent e) => e.arguments,
            'arguments',
            <String, Object>{'id': 1},
          ),
    );
    expect(
      h.events[1],
      isA<HostHandlerEvent>().having(
        (HostHandlerEvent e) => e.handler.id,
        'id',
        'approve',
      ),
    );
    expect((h.events[2] as TemplateEvent).arguments, <String, Object>{
      'value': 'typed',
    }, reason: 'a value handler passes {value: v}');
  });

  testWidgets('a control whose handler does nothing is disabled', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness('''
      import core;
      widget root = Column(children: [
        Button(key: "none", onPressed: call args.missing {}, child: Text(text: "x")),
        Field(onChanged: absent),
      ]);
    ''');
    await tester.pumpWidget(h.view());
    expect(
      tester
          .widget<GestureDetector>(find.byKey(const ValueKey<String>('none')))
          .onTap,
      isNull,
    );
    expect(tester.widget<_Field>(find.byType(_Field)).onChanged, isNull);
  });

  testWidgets('a data update renders again and keeps the state', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness(
      '''
      import core;
      widget root { open: false } = Column(children: [
        Text(text: concat(a: data.name, b: switch state.open { true: " (open)", default: "" })),
        Button(key: "open", onPressed: set state.open = true, child: Text(text: "open")),
      ]);
    ''',
      data: <String, Object?>{'name': 'Ann'},
    );
    await tester.pumpWidget(h.view());
    await tester.tap(find.byKey(const ValueKey<String>('open')));
    await tester.pump();
    expect(find.text('Ann (open)'), findsOneWidget);
    h.runtime.data = <String, Object?>{'name': 'Grace'};
    await tester.pump();
    expect(find.text('Grace (open)'), findsOneWidget);
  });

  testWidgets('a change during a build is rendered after that frame', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness(
      '''
      import core;
      widget root = Text(text: data.v);
    ''',
      data: <String, Object?>{'v': 'first'},
    );
    Widget page(String value) => Directionality(
      textDirection: TextDirection.ltr,
      child: Column(
        children: <Widget>[
          Builder(
            key: ValueKey<String>(value),
            builder: (BuildContext context) {
              h.runtime.data = <String, Object?>{'v': value};
              return const SizedBox();
            },
          ),
          h.view(),
        ],
      ),
    );
    await tester.pumpWidget(page('first'));
    await tester.pumpWidget(page('second'));
    expect(tester.takeException(), isNull);
    await tester.pump();
    expect(find.text('second'), findsOneWidget);
  });

  testWidgets('error nodes render placeholders and are reported once', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness('''
      import core;
      widget root = Column(children: [Text(text: nope()), Text(text: "ok")]);
    ''');
    await tester.pumpWidget(h.view());
    expect(find.byType(ErrorWidget), findsOneWidget);
    expect(find.text('ok'), findsOneWidget);
    expect(h.errors, hasLength(1));
    expect(
      (h.errors.single as ExpansionError).kind,
      ExpansionErrorKind.unknownFunction,
    );
    await tester.pump();
    expect(h.errors, hasLength(1));
  });

  testWidgets('a primitive without a widget is a reported placeholder', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness('''
      import core;
      widget root = Column(children: [Text(text: "ok")]);
    ''');
    await tester.pumpWidget(
      h.view(
        libraries: <LibraryName, PrimitiveWidgetLibrary>{
          coreLibrary: PrimitiveWidgetLibrary(<String, PrimitiveWidget>{
            'Column': _testWidgets.widgets['Column']!,
          }),
        },
      ),
    );
    expect(find.byType(ErrorWidget), findsOneWidget);
    await tester.pump();
    expect(h.errors.single, isA<MissingPrimitiveWidget>());
  });

  testWidgets('builders render their outputs, with their own state', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness(
      '''
      import core;
      widget Item { taps: 0 } = Button(
        key: concat(a: "item", b: args.i),
        onPressed: set state.taps = add(a: state.taps, b: 1),
        child: Text(text: concat(a: args.i, b: concat(a: ":", b: state.taps))),
      );
      widget root = List(count: data.n, builder: (item) => Item(i: item.index));
    ''',
      data: <String, Object?>{'n': 2},
    );
    await tester.pumpWidget(h.view());
    expect(find.text('0:0'), findsOneWidget);
    expect(find.text('1:0'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey<String>('item1')));
    await tester.pump();
    expect(find.text('1:1'), findsOneWidget);
    expect(find.text('0:0'), findsOneWidget);
  });

  testWidgets('a disposed view stops listening to the runtime', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness(
      '''
      import core;
      widget root = Text(text: data.v);
    ''',
      data: <String, Object?>{'v': 'a'},
    );
    await tester.pumpWidget(h.view());
    await tester.pumpWidget(const SizedBox());
    expect(() => h.runtime.data = <String, Object?>{'v': 'b'}, returnsNormally);
    expect(tester.takeException(), isNull);
  });

  testWidgets('changes during one build give one expansion', (
    WidgetTester tester,
  ) async {
    int expansions = 0;
    final _Harness h = _Harness(
      '''
      import core;
      import t;
      widget root = Text(text: concat(a: data.v, b: t::count()));
    ''',
      data: <String, Object?>{'v': 'first'},
    );
    h.registry.setHostFunctions(
      const LibraryName(<String>['t']),
      <String, LocalFunction>{
        'count': LocalFunction(
          arguments: const <String, FunctionArgType>{},
          implementation: (DynamicMap arguments) => '#${expansions += 1}',
        ),
      },
    );
    Widget page(String value) => Directionality(
      textDirection: TextDirection.ltr,
      child: Column(
        children: <Widget>[
          Builder(
            key: ValueKey<String>(value),
            builder: (BuildContext context) {
              for (int i = 0; i < 3; i += 1) {
                h.runtime.data = <String, Object?>{'v': '$value$i'};
              }
              return const SizedBox();
            },
          ),
          h.view(),
        ],
      ),
    );
    await tester.pumpWidget(page('a'));
    final int before = expansions;
    await tester.pumpWidget(page('b'));
    await tester.pump();
    expect(expansions, before + 1);
    expect(find.text('b2#${before + 1}'), findsOneWidget);
  });

  testWidgets('errors are not reported once the view is gone', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness('''
      import core;
      widget root { n: 0 } = Button(key: "b", onPressed: set state.n = absent, child: Text(text: "b"));
    ''');
    await tester.pumpWidget(h.view());
    await tester.tap(find.byKey(const ValueKey<String>('b')));
    await tester.pumpWidget(const SizedBox());
    expect(h.errors, isEmpty);
  });

  testWidgets('a rendering error is reported once per expansion', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness(
      '''
      import core;
      widget root = Column(children: [Text(text: data.v), List(count: 1, builder: (i) => Text(text: nope()))]);
    ''',
      data: <String, Object?>{'v': 'a'},
    );
    final Map<LibraryName, PrimitiveWidgetLibrary> withoutText =
        <LibraryName, PrimitiveWidgetLibrary>{
          coreLibrary: PrimitiveWidgetLibrary(<String, PrimitiveWidget>{
            'Column': _testWidgets.widgets['Column']!,
            'List': _testWidgets.widgets['List']!,
          }),
        };
    await tester.pumpWidget(h.view(libraries: withoutText));
    await tester.pump();
    expect(h.errors, hasLength(2));
    await tester.pumpWidget(h.view(libraries: withoutText));
    await tester.pump();
    expect(h.errors, hasLength(2), reason: 'a rebuild reports nothing new');
    h.runtime.data = <String, Object?>{'v': 'b'};
    await tester.pump();
    expect(h.errors, hasLength(4), reason: 'a new expansion reports again');
    expect(h.errors.whereType<MissingPrimitiveWidget>(), hasLength(2));
  });

  testWidgets('a firing error is reported', (WidgetTester tester) async {
    final _Harness h = _Harness('''
      import core;
      widget root { n: 0 } = Button(key: "b", onPressed: set state.n = divide(a: 1, b: 0), child: Text(text: state.n));
    ''');
    await tester.pumpWidget(h.view());
    await tester.tap(find.byKey(const ValueKey<String>('b')));
    await tester.pump();
    expect((h.errors.single as FireError).kind, FireErrorKind.absentValue);
    expect(find.text('0'), findsOneWidget);
  });
}
