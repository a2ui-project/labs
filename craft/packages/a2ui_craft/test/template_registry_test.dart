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

// Unit tests for what the conformance cases in
// craft/conformance/template_registry.yaml cannot express: metadata that is
// not a value, the copies of a primitive library and of a dependency
// declaration taken at registration, and the function table the registry
// builds for each library.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

const LibraryName _core = LibraryName(<String>['core']);
const LibraryName _main = LibraryName(<String>['main']);

class _Primitives extends PrimitiveLibrary {
  _Primitives(this.widgetMeta);

  @override
  final Map<String, Map<String, Object?>> widgetMeta;

  @override
  Iterable<String> get widgetNames => widgetMeta.keys;
}

Object _probe(TemplateRegistry registry, String expression) {
  final RemoteWidgetLibrary library = parseLibraryFile(
    'import core; widget probe = Result(value: $expression);',
  );
  registry.setTemplateLibrary(_main, library);
  return registry.evaluate(
    (library.widgets.single.root as ConstructorCall).arguments['value'],
    library: _main,
    declaration: 'probe',
  );
}

void main() {
  test('metadata that is not a value is rejected at registration', () {
    final TemplateRegistry registry = TemplateRegistry()
      ..setPrimitiveLibrary(
        _core,
        _Primitives(<String, Map<String, Object?>>{
          'Text': <String, Object?>{'version': 1},
        }),
      );
    for (final Map<String, Object?> meta in <Map<String, Object?>>[
      <String, Object?>{'when': DateTime(2026)},
      <String, Object?>{
        'args': <Object?>[1, Object()],
      },
      <String, Object?>{
        'keys': <int, Object?>{1: 'a'},
      },
    ]) {
      expect(
        () => registry.setPrimitiveLibrary(
          _core,
          _Primitives(<String, Map<String, Object?>>{'Text': meta}),
        ),
        throwsArgumentError,
        reason: '$meta',
      );
    }
    expect(_probe(registry, 'meta(w: "Text", path: "version")'), 1);
  });

  test('null in metadata is absent', () {
    final TemplateRegistry registry = TemplateRegistry()
      ..setPrimitiveLibrary(
        _core,
        _Primitives(<String, Map<String, Object?>>{
          'Text': <String, Object?>{
            'args': <String, Object?>{'text': null},
            'list': <Object?>[null],
          },
        }),
      );
    expect(
      _probe(registry, 'hasWidgetArg(widget: "Text", arg: "text")'),
      false,
    );
    expect(_probe(registry, 'Text.list'), <Object>[missing]);
    expect(_probe(registry, 'Text.list.0'), missing);
  });

  test('a primitive library is copied at registration', () {
    final Map<String, Map<String, Object?>> meta =
        <String, Map<String, Object?>>{
          'Text': <String, Object?>{'version': 1},
        };
    final TemplateRegistry registry = TemplateRegistry()
      ..setPrimitiveLibrary(_core, _Primitives(meta));
    meta['Text']!['version'] = 2;
    meta['Box'] = <String, Object?>{};
    expect(_probe(registry, 'Text.version'), 1);
    expect(_probe(registry, 'hasWidget(name: "Box")'), false);
    expect(registry.offeredComponents(_core), <String>['Text']);
  });

  test('a dependency declaration is copied at registration', () {
    final Set<LibraryName> optional = <LibraryName>{};
    final List<HostRequirement> requires = <HostRequirement>[];
    final List<HostRequirement> cardNeeds = <HostRequirement>[];
    final Map<String, List<HostRequirement>> components =
        <String, List<HostRequirement>>{'Card': cardNeeds};
    final TemplateRegistry registry = TemplateRegistry()
      ..setTemplateLibrary(
        _main,
        parseLibraryFile(
          'import gone; export widget Card = Box(); widget Helper = Box();',
        ),
        dependencies: LibraryDependencies(
          optional: optional,
          requires: requires,
          components: components,
        ),
      );
    optional.add(const LibraryName(<String>['gone']));
    requires.add(const WidgetRequirement('Nope'));
    cardNeeds.add(const FunctionRequirement('nope'));
    components['Helper'] = <HostRequirement>[const FunctionRequirement('add')];
    final LibraryAvailability availability = registry.availability(_main)!;
    expect(availability.available, false);
    expect(availability.unmet, <Requirement>[
      const ImportRequirement(LibraryName(<String>['gone'])),
    ]);
    expect(availability.components.keys, <String>['Card']);
    expect(availability.components['Card']!.unmet, isEmpty);
  });

  test('each library gets its own introspection functions', () {
    final TemplateRegistry registry = TemplateRegistry()
      ..setPrimitiveLibrary(
        const LibraryName(<String>['maps']),
        _Primitives(<String, Map<String, Object?>>{'Map': <String, Object?>{}}),
      );
    final RemoteWidgetLibrary withMaps = parseLibraryFile('import maps;');
    final RemoteWidgetLibrary without = parseLibraryFile('');
    registry
      ..setTemplateLibrary(_main, withMaps)
      ..setTemplateLibrary(const LibraryName(<String>['other']), without);
    Object hasMap(String library) => registry
        .functionsFor(LibraryName(<String>[library]))['hasWidget']!
        .implementation(<String, Object?>{'name': 'maps::Map'})!;
    expect(hasMap('main'), true);
    expect(hasMap('other'), false);
    expect(registry.functionsFor(_main).keys.toSet(), <String>{
      ...standardFunctions.keys,
      ...introspectionFunctionNames,
    });
  });

  test('requirements print and compare by kind, name and argument', () {
    expect(
      const WidgetRequirement('maps::Map', arg: 'zoom').toJson(),
      <String, Object?>{'widget': 'maps::Map', 'arg': 'zoom'},
    );
    expect(
      const FunctionRequirement('add'),
      isNot(const WidgetRequirement('add')),
    );
    expect(
      const ImportRequirement(_core),
      const ImportRequirement(LibraryName(<String>['core'])),
    );
  });
}
