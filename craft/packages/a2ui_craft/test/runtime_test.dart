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

// Unit tests for what craft/conformance/craft/craft_runtime.yaml cannot
// express: nodes that only the binary format or the library model can hold,
// host input, and the runtime's notifications and snapshots.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

const LibraryName _main = LibraryName(<String>['main']);

class _Core extends PrimitiveLibrary {
  @override
  Iterable<String> get widgetNames => const <String>['Text', 'Button', 'Box'];

  @override
  Map<String, Map<String, Object?>> get widgetMeta =>
      <String, Map<String, Object?>>{
        for (final String name in widgetNames) name: const <String, Object?>{},
      };
}

TemplateRegistry _registry(RemoteWidgetLibrary main) => TemplateRegistry()
  ..setPrimitiveLibrary(coreLibrary, _Core())
  ..setTemplateLibrary(_main, main);

/// A runtime whose root is `root = Box(value: <value>)`, built in the model.
CraftRuntime _boxOf(Object value, {DynamicMap? state}) => CraftRuntime(
  _registry(
    RemoteWidgetLibrary(
      const <Import>[Import(coreLibrary)],
      <WidgetDeclaration>[
        WidgetDeclaration(
          'root',
          state,
          ConstructorCall('Box', <String, Object?>{'value': value}),
        ),
      ],
    ),
  ),
  library: _main,
  widget: 'root',
);

CraftRuntime _parsed(String source, {Object? data}) => CraftRuntime(
  _registry(parseLibraryFile(source)),
  library: _main,
  widget: 'root',
  data: data,
);

String? _errorKind(Expansion expansion) => switch (expansion.root) {
  ErrorNode(:final ExpansionErrorKind kind) => kind.name,
  _ => null,
};

void main() {
  group('nodes the text format does not produce', () {
    test('theme and media references are not evaluated', () {
      expect(
        _errorKind(_boxOf(const ThemeReference(<Object>['color'])).expand()),
        'notEvaluated',
      );
      expect(
        _errorKind(_boxOf(const MediaReference(<Object>['width'])).expand()),
        'notEvaluated',
      );
    });

    test('a loop outside a list is an invalid value', () {
      expect(
        _errorKind(_boxOf(const Loop(<Object?>[1], 'x')).expand()),
        'invalidValue',
      );
    });

    test('a loop reference without its loop is an invalid value', () {
      expect(
        _errorKind(_boxOf(const LoopReference(0, <Object>[])).expand()),
        'invalidValue',
      );
      expect(
        _errorKind(_boxOf(const LoopReference(-1, <Object>[])).expand()),
        'invalidValue',
      );
    });

    test('a builder argument reference without its builder is invalid', () {
      expect(
        _errorKind(
          _boxOf(const WidgetBuilderArgReference('x', <Object>[])).expand(),
        ),
        'invalidValue',
      );
    });

    test('a setter without parts names no existing state', () {
      final CraftRuntime runtime = _boxOf(
        const SetStateHandler(StateReference(<Object>[]), 1),
        state: <String, Object?>{'a': 0},
      );
      final WidgetNode box = runtime.expand().root as WidgetNode;
      final FireResult result = runtime.fire(box.arguments['value']!);
      expect(result.errors.single.kind, FireErrorKind.unknownState);
      expect(result.stateChanged, isFalse);
    });
  });

  group('host input', () {
    test('arguments and data must be values', () {
      final TemplateRegistry registry = _registry(
        parseLibraryFile('import core; widget root = Text();'),
      );
      expect(
        () => CraftRuntime(
          registry,
          library: _main,
          widget: 'root',
          args: <String, Object?>{'x': Object()},
        ),
        throwsArgumentError,
      );
      expect(
        () => CraftRuntime(
          registry,
          library: _main,
          widget: 'root',
          data: <String, Object?>{'h': const HostHandler('id')},
        ),
        throwsArgumentError,
        reason: 'host handlers are allowed only in arguments',
      );
      final CraftRuntime runtime = CraftRuntime(
        registry,
        library: _main,
        widget: 'root',
        args: <String, Object?>{
          'h': <Object?>[const HostHandler('id'), null],
        },
        data: <Object?, Object?>{'untyped': 1},
      );
      expect(runtime.args['h'], <Object>[const HostHandler('id'), missing]);
      expect(() => runtime.data = <int, Object?>{1: 2}, throwsArgumentError);
      expect(
        () => runtime.fire(missing, <String, Object?>{'x': Object()}),
        throwsArgumentError,
      );
    });

    test('a builder key is a string or an integer', () {
      final CraftRuntime runtime = _parsed(
        'import core; widget root = Box(b: (x) => Text());',
      );
      final WidgetNode box = runtime.expand().root as WidgetNode;
      final BuilderNode builder = box.arguments['b']! as BuilderNode;
      expect(
        () => runtime.expandBuilder(builder, 1.5, null),
        throwsArgumentError,
      );
      expect(runtime.expandBuilder(builder, 'k', null).root, isA<WidgetNode>());
    });
  });

  group('reloads', () {
    test('registering the same library object again resets the state', () {
      final RemoteWidgetLibrary library = parseLibraryFile('''
        import core;
        widget root { n: 0 } = Box(value: state.n, set: set state.n = 5);
      ''');
      final TemplateRegistry registry = _registry(library);
      final CraftRuntime runtime = CraftRuntime(
        registry,
        library: _main,
        widget: 'root',
      );
      Object value() =>
          (runtime.expand().root as WidgetNode).arguments['value']!;
      final WidgetNode box = runtime.expand().root as WidgetNode;
      runtime.fire(box.arguments['set']!);
      expect(value(), 5);
      registry.setPrimitiveLibrary(
        const LibraryName(<String>['other']),
        _Core(),
      );
      expect(value(), 5, reason: 'another library changed');
      registry.setTemplateLibrary(_main, library);
      expect(value(), 0);
      expect(
        runtime.fire(box.arguments['set']!).errors.single.kind,
        FireErrorKind.unknownState,
        reason: 'a setter of the old instance',
      );
    });

    test('every registration or removal of a name is a new generation', () {
      final TemplateRegistry registry = TemplateRegistry();
      const LibraryName name = LibraryName(<String>['x']);
      expect(registry.generation(name), 0);
      final RemoteWidgetLibrary library = parseLibraryFile('widget a = B();');
      registry.setTemplateLibrary(name, library);
      registry.setTemplateLibrary(name, library);
      expect(registry.generation(name), 2);
      registry.setPrimitiveLibrary(name, _Core());
      registry.removeLibrary(name);
      expect(registry.generation(name), 4);
      expect(registry.removeLibrary(name), isFalse);
      expect(registry.generation(name), 4, reason: 'nothing was removed');
      expect(registry.generation(const LibraryName(<String>['y'])), 0);
    });
  });

  group('notifications and snapshots', () {
    const String counter = '''
      import core;
      widget root { list: [0] } = Box(
        value: state.list,
        inc: set state.list.0 = 1,
        noop: event "e" {},
      );
    ''';

    test('listeners hear updates, setters that set state and refresh', () {
      final CraftRuntime runtime = _parsed(counter);
      int calls = 0;
      void listener() => calls += 1;
      runtime.addListener(listener);
      final WidgetNode box = runtime.expand().root as WidgetNode;
      runtime.data = 1;
      runtime.args = const <String, Object?>{};
      runtime.refresh();
      expect(calls, 3);
      expect(runtime.fire(box.arguments['noop']!).stateChanged, isFalse);
      expect(calls, 3);
      expect(runtime.fire(box.arguments['inc']!).stateChanged, isTrue);
      expect(calls, 4);
      runtime.removeListener(listener);
      runtime.refresh();
      expect(calls, 4);
    });

    test('an expansion keeps what it read when state changes', () {
      final CraftRuntime runtime = _parsed(counter);
      final Expansion before = runtime.expand();
      final WidgetNode box = before.root as WidgetNode;
      runtime.fire(box.arguments['inc']!);
      expect(box.arguments['value'], <Object>[0]);
      expect(before.states.single.value, <String, Object>{
        'list': <Object>[0],
      });
      expect((runtime.expand().root as WidgetNode).arguments['value'], <Object>[
        1,
      ]);
    });

    test('errors carry a message for authors', () {
      final Expansion expansion = _parsed(
        'import core; widget root = Text(text: nope());',
      ).expand();
      expect(expansion.errors.single.node.message, contains('nope'));
      expect(expansion.errors.single.toString(), contains('unknownFunction'));
    });
  });
}
