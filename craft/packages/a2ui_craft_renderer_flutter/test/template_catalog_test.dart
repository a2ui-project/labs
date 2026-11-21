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

// Widget tests of the template catalog on an A2UI surface
// (craft_a2ui_integration requirement 7): A2UI messages render templates, data
// and property updates reach them, two-way bindings write to the data model,
// and handlers become actions.

import 'package:a2ui_core/a2ui_core.dart';
import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:a2ui_craft_flutter/a2ui_craft_flutter.dart';
import 'package:a2ui_craft_renderer_flutter/a2ui_craft_renderer_flutter.dart';
import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:a2ui_flutter/basic_catalog.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

const String _catalogId = 'https://example.com/templates/catalog.json';
const LibraryName _main = LibraryName(<String>['main']);

/// Test-only primitives, with the argument kinds the schemas are derived
/// from.
final PrimitiveWidgetLibrary _core = PrimitiveWidgetLibrary(
  <String, PrimitiveWidget>{
    'Column': PrimitiveWidget(
      (BuildContext context, PrimitiveArguments args) => Column(
        mainAxisSize: MainAxisSize.min,
        children: args.children('children'),
      ),
      meta: const <String, Object?>{
        'args': <String, Object?>{'children': 'widgets'},
      },
    ),
    'Text': PrimitiveWidget(
      (BuildContext context, PrimitiveArguments args) =>
          Text(switch (args['text']) {
            Missing() => '',
            final Object value => '$value',
          }),
      meta: const <String, Object?>{
        'args': <String, Object?>{'text': 'string'},
      },
    ),
    'Button': PrimitiveWidget(
      (BuildContext context, PrimitiveArguments args) => GestureDetector(
        key: ValueKey<String?>(args.value<String>('key')),
        onTap: args.handler('onPressed'),
        child: args.child('child') ?? const SizedBox(),
      ),
      meta: const <String, Object?>{
        'args': <String, Object?>{
          'child': 'widget',
          'onPressed': 'handler',
          'key': 'string',
        },
      },
    ),
    'Field': PrimitiveWidget(
      (BuildContext context, PrimitiveArguments args) => _Field(
        value: args.value<String>('value') ?? '',
        onChanged: args.valueHandler('onChanged'),
      ),
      meta: const <String, Object?>{
        'args': <String, Object?>{'value': 'string', 'onChanged': 'handler'},
      },
    ),
  },
);

/// A text field that shows its value and fires its handler on edits.
class _Field extends StatefulWidget {
  const _Field({required this.value, required this.onChanged});

  final String value;
  final ValueChanged<Object?>? onChanged;

  @override
  State<_Field> createState() => _FieldState();
}

class _FieldState extends State<_Field> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.value,
  );

  @override
  void didUpdateWidget(_Field oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_controller.text != widget.value) _controller.text = widget.value;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 200,
    child: TextField(
      controller: _controller,
      enabled: widget.onChanged != null,
      onChanged: widget.onChanged,
    ),
  );
}

const String _templates = '''
  import core;
  import maps;

  export widget NameField = Column(children: [
    Text(text: args.label),
    Field(value: args.value, onChanged: args.setValue),
    ...if switch args.isValid { false: true, default: false }: Text(text: args.validationErrors.0),
  ]);

  export widget Counter { count: 0 } = Column(children: [
    Text(text: concat(a: args.title, b: concat(a: ": ", b: state.count))),
    Button(key: "inc", child: Text(text: "more"), onPressed: set state.count = add(a: state.count, b: 1)),
  ]);

  export widget Card = Column(children: [
    Text(text: args.title),
    args.body,
    ...for c in args.items: c,
    Button(key: "save", child: Text(text: "save"), onPressed: [args.onSave, event "saved" { title: args.title }]),
  ]);

  export widget Broken = Column(children: [Nope()]);

  export widget StoreMap = maps::Map();
''';

class _Harness {
  _Harness() {
    registry
      ..setPrimitiveLibrary(coreLibrary, _core)
      ..setTemplateLibrary(
        _main,
        parseLibraryFile(_templates),
        dependencies: LibraryDependencies(
          optional: <LibraryName>{
            LibraryName(<String>['maps']),
          },
          components: const <String, List<HostRequirement>>{
            'StoreMap': <HostRequirement>[WidgetRequirement('maps::Map')],
          },
        ),
      );
    catalog = templateCatalog(
      id: _catalogId,
      registry: registry,
      library: _main,
      primitives: <LibraryName, PrimitiveWidgetLibrary>{coreLibrary: _core},
      functions: basicCatalog().functions.values.toList(),
      onError: (String id, Object error) => templateErrors.add((id, error)),
    );
    processor = MessageProcessor<ComponentImplementation>(
      catalogs: <CatalogImplementation>[catalog, basicCatalog()],
      validationConfig: ValidationConfig.strict,
    );
    processor.model.onAction.subscribe(actions.add);
    processor.model.onSurfaceCreated.subscribe(
      (SurfaceModel<ComponentImplementation> s) =>
          s.onError.subscribe(errors.add),
    );
  }

  final TemplateRegistry registry = TemplateRegistry();
  late final CatalogImplementation catalog;
  late final MessageProcessor<ComponentImplementation> processor;
  final List<A2uiRendererAction> actions = <A2uiRendererAction>[];
  final List<A2uiRendererError> errors = <A2uiRendererError>[];
  final List<(String, Object)> templateErrors = <(String, Object)>[];

  SurfaceModel<ComponentImplementation> get surface =>
      processor.model.getSurface('s')!;

  void send(String kind, Map<String, Object?> body) =>
      processor.processMessages(<Map<String, Object?>>[
        <String, Object?>{
          'version': '1.0',
          kind: <String, Object?>{'surfaceId': 's', ...body},
        },
      ]);

  Future<void> pump(
    WidgetTester tester,
    List<Map<String, Object?>> components, {
    Map<String, Object?>? data,
  }) async {
    addTearDown(processor.model.dispose);
    send('createSurface', <String, Object?>{
      'catalogId': _catalogId,
      'dataModel': ?data,
    });
    send('updateComponents', <String, Object?>{'components': components});
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: A2uiSurface(surface: surface)),
      ),
    );
  }
}

Map<String, Object?> _bind(String path) => <String, Object?>{'@path': path};

const String _basic = BasicCatalog.v1_0Id;

void main() {
  test('offers each available component with its schema', () {
    final _Harness h = _Harness();
    expect(h.catalog.protocolVersion, A2uiProtocolVersion.v1_0);
    expect(h.catalog.components.keys, <String>[
      'NameField',
      'Counter',
      'Card',
      'Broken',
    ]);
    expect(
      h.catalog.components['Card']!.schema.value,
      templateCatalogSchemas(h.registry, _main)['Card'],
    );
  });

  testWidgets('renders a template and follows data updates', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness();
    await h.pump(
      tester,
      <Map<String, Object?>>[
        <String, Object?>{
          'id': 'root',
          'component': 'Counter',
          'title': _bind('/title'),
        },
      ],
      data: <String, Object?>{'title': 'Clicks'},
    );
    expect(find.text('Clicks: 0'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey<String?>('inc')));
    await tester.pump();
    expect(find.text('Clicks: 1'), findsOneWidget);

    h.send('updateDataModel', <String, Object?>{
      'path': '/title',
      'value': 'Taps',
    });
    await tester.pump();
    await tester.pump();
    expect(find.text('Taps: 1'), findsOneWidget, reason: 'state is kept');

    h.send('updateComponents', <String, Object?>{
      'components': <Object?>[
        <String, Object?>{
          'id': 'root',
          'component': 'Counter',
          'title': 'Hits',
        },
      ],
    });
    await tester.pump();
    await tester.pump();
    expect(find.text('Hits: 1'), findsOneWidget, reason: 'state is kept');
    expect(h.errors, isEmpty);
    expect(h.templateErrors, isEmpty);
  });

  testWidgets('a two-way binding writes to the data model', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness();
    await h.pump(
      tester,
      <Map<String, Object?>>[
        <String, Object?>{
          'id': 'root',
          'component': 'Card',
          'title': 'Profile',
          'body': 'field',
          'items': <Object?>['echo'],
        },
        <String, Object?>{
          'id': 'field',
          'component': 'NameField',
          'label': 'Name',
          'value': _bind('/user/name'),
        },
        <String, Object?>{
          'id': 'echo',
          '@catalogId': _basic,
          'component': 'Text',
          'text': _bind('/user/name'),
        },
      ],
      data: <String, Object?>{
        'user': <String, Object?>{'name': 'Ann'},
      },
    );
    expect(find.text('Profile'), findsOneWidget);
    expect(find.text('Name'), findsOneWidget);
    expect(find.text('Ann'), findsNWidgets(2));

    await tester.enterText(find.byType(TextField), 'Bo');
    await tester.pump();
    expect(h.surface.dataModel.get('/user/name'), 'Bo');
    await tester.pump();
    expect(find.text('Bo'), findsNWidgets(2), reason: 'the echo follows');
    expect(h.errors, isEmpty);
  });

  testWidgets('an unbound value has no setter, so the field is disabled', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness();
    await h.pump(tester, <Map<String, Object?>>[
      <String, Object?>{
        'id': 'root',
        'component': 'NameField',
        'label': 'Name',
        'value': 'fixed',
      },
    ]);
    expect(tester.widget<TextField>(find.byType(TextField)).enabled, isFalse);
  });

  testWidgets('the agent action and the template event are dispatched', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness();
    await h.pump(
      tester,
      <Map<String, Object?>>[
        <String, Object?>{
          'id': 'root',
          'component': 'Card',
          'title': _bind('/title'),
          'onSave': <String, Object?>{
            'event': <String, Object?>{
              'name': 'save',
              'context': <String, Object?>{'title': _bind('/title')},
            },
          },
        },
      ],
      data: <String, Object?>{'title': 'Draft'},
    );

    await tester.tap(find.byKey(const ValueKey<String?>('save')));
    await tester.pump();
    expect(
      <Object?>[
        for (final A2uiRendererAction a in h.actions)
          <Object?>[a.name, a.sourceComponentId, a.context],
      ],
      <Object?>[
        <Object?>[
          'save',
          'root',
          <String, Object?>{'title': 'Draft'},
        ],
        <Object?>[
          'saved',
          'root',
          <String, Object?>{'title': 'Draft'},
        ],
      ],
    );
  });

  testWidgets('check results reach the template', (WidgetTester tester) async {
    final _Harness h = _Harness();
    await h.pump(
      tester,
      <Map<String, Object?>>[
        <String, Object?>{
          'id': 'root',
          'component': 'NameField',
          'label': 'Name',
          'value': _bind('/name'),
          '@checks': <Object?>[
            <String, Object?>{
              'condition': <String, Object?>{
                '@call': 'required',
                'args': <String, Object?>{'value': _bind('/name')},
              },
              'message': 'Name is required',
            },
          ],
        },
      ],
      data: <String, Object?>{'name': 'Ann'},
    );
    expect(find.text('Name is required'), findsNothing);

    await tester.enterText(find.byType(TextField), '');
    await tester.pump();
    await tester.pump();
    expect(find.text('Name is required'), findsOneWidget);
    expect(h.errors, isEmpty);
  });

  testWidgets('a property the schema lacks is rejected', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness();
    await h.pump(tester, <Map<String, Object?>>[
      <String, Object?>{'id': 'root', 'component': 'Counter', 'title': 'x'},
    ]);
    expect(
      () => h.send('updateComponents', <String, Object?>{
        'components': <Object?>[
          <String, Object?>{
            'id': 'root',
            'component': 'Counter',
            'title': 'x',
            'elevation': 2,
          },
        ],
      }),
      throwsA(isA<A2uiValidationError>()),
    );
    h.send('updateComponents', <String, Object?>{
      'components': <Object?>[
        <String, Object?>{'id': 'root', 'component': 'Counter', 'title': 'y'},
      ],
    });
    await tester.pump();
    await tester.pump();
    expect(find.text('y: 0'), findsOneWidget);
  });

  testWidgets('expansion errors go to the host with the component id', (
    WidgetTester tester,
  ) async {
    final _Harness h = _Harness();
    await h.pump(tester, <Map<String, Object?>>[
      <String, Object?>{'id': 'root', 'component': 'Broken'},
    ]);
    await tester.pump();
    expect(h.templateErrors, hasLength(1));
    expect(h.templateErrors.single.$1, 'root');
    expect(h.templateErrors.single.$2, isA<ExpansionError>());
  });
}
