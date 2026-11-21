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

// Runs the conformance suite of the craft_a2ui_integration feature
// (craft/conformance/craft/craft_a2ui_integration.yaml). The YAML header
// documents the case format.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

import 'conformance_harness.dart';

/// The keys that set up a case's registry, for both actions.
const Set<String> _registryKeys = <String>{
  'primitives',
  'libraries',
  'dependencies',
  'catalog',
};

void main() {
  runConformanceSuite(
    'craft/craft_a2ui_integration.yaml',
    <String, ConformanceAction>{
      'derive_catalog_schema': const ConformanceAction(<String>{
        ..._registryKeys,
        'expect',
      }, _checkSchemas),
      'map_props': const ConformanceAction(<String>{
        ..._registryKeys,
        'component',
        'props',
        'expect',
        'steps',
      }, _checkArgs),
    },
  );
}

void _checkSchemas(ConformanceTestCase c) {
  final Map<String, Object?> expected = c['expect']! as Map<String, Object?>;
  assertKnownKeys(expected, const <String>{
    'schemas',
    'properties',
    'checkable',
  }, 'expect');
  final Map<String, Map<String, Object?>> schemas = templateCatalogSchemas(
    _registry(c),
    _catalog(c),
  );
  if (expected.containsKey('schemas')) {
    expect(schemas, expected['schemas'], reason: 'schemas');
  }
  if (expected.containsKey('properties')) {
    expect(
      <String, Object?>{
        for (final MapEntry<String, Map<String, Object?>> s in schemas.entries)
          s.key: _properties(s.value),
      },
      expected['properties'],
      reason: 'properties',
    );
    expect(
      <String>[
        for (final MapEntry<String, Map<String, Object?>> s in schemas.entries)
          if ((s.value['allOf']! as List<Object?>).length == 2) s.key,
      ],
      expected['checkable'] ?? <Object?>[],
      reason: 'checkable',
    );
  }
}

LibraryName _catalog(ConformanceTestCase c) =>
    _library(c['catalog'] as String? ?? 'main');

const Map<String, Object?> _defaultPrimitives = <String, Object?>{
  'core': <String, Object?>{
    'Column': <String, Object?>{
      'args': <String, Object?>{'children': 'widgets'},
    },
    'Row': <String, Object?>{
      'args': <String, Object?>{'children': 'widgets'},
    },
    'Text': <String, Object?>{
      'args': <String, Object?>{'text': 'string'},
    },
    'Button': <String, Object?>{
      'args': <String, Object?>{'child': 'widget', 'onPressed': 'handler'},
    },
    'Field': <String, Object?>{
      'args': <String, Object?>{
        'value': 'string',
        'onChanged': 'handler',
        'error': 'string',
      },
    },
    'Toggle': <String, Object?>{
      'args': <String, Object?>{'value': 'boolean', 'onChanged': 'handler'},
    },
    'Slider': <String, Object?>{
      'args': <String, Object?>{'value': 'number', 'onChanged': 'handler'},
    },
    'Box': <String, Object?>{
      'args': <String, Object?>{'child': 'widget', 'style': true},
    },
    'List': <String, Object?>{
      'args': <String, Object?>{'builder': true},
    },
  },
};

TemplateRegistry _registry(ConformanceTestCase c) {
  final TemplateRegistry registry = TemplateRegistry();
  for (final MapEntry<String, Object?> p in _entries(
    c['primitives'] ?? _defaultPrimitives,
  )) {
    registry.setPrimitiveLibrary(
      _library(p.key),
      _Primitives(p.value! as Map<String, Object?>),
    );
  }
  final Map<String, Object?> dependencies =
      c['dependencies'] as Map<String, Object?>? ?? const <String, Object?>{};
  for (final MapEntry<String, Object?> l in _entries(c['libraries'])) {
    final Map<String, Object?> components =
        (dependencies[l.key] as Map<String, Object?>?)?['components']
            as Map<String, Object?>? ??
        const <String, Object?>{};
    registry.setTemplateLibrary(
      _library(l.key),
      parseLibraryFile(l.value! as String),
      dependencies: LibraryDependencies(
        components: <String, List<HostRequirement>>{
          for (final MapEntry<String, Object?> r in components.entries)
            r.key: <HostRequirement>[
              for (final Object? w in r.value! as List<Object?>)
                WidgetRequirement(
                  (w! as Map<String, Object?>)['widget']! as String,
                ),
            ],
        },
      ),
    );
  }
  return registry;
}

/// Each property of [schema] (its last `allOf` entry) with the name of the
/// common type it references.
Map<String, Object?> _properties(Map<String, Object?> schema) {
  final List<Object?> allOf = schema['allOf']! as List<Object?>;
  final Map<String, Object?> properties =
      (allOf.last! as Map<String, Object?>)['properties']!
          as Map<String, Object?>;
  return <String, Object?>{
    for (final MapEntry<String, Object?> p in properties.entries)
      if (p.key != 'component')
        p.key: ((p.value! as Map<String, Object?>)[r'$ref']! as String)
            .split('/')
            .last,
  };
}

void _checkArgs(ConformanceTestCase c) {
  final TemplateRegistry registry = _registry(c);
  final LibraryName catalog = _catalog(c);
  final String component = c['component']! as String;
  final Map<String, Object?> expected = c['expect']! as Map<String, Object?>;
  assertKnownKeys(expected, const <String>{
    'args',
    'widgets',
    'tree',
  }, 'expect');
  final TemplateArgs args = TemplateArgs.from(
    templateInterfaces(registry, catalog)[component]!,
    <String, Object?>{
      for (final MapEntry<String, Object?> p in _entries(c['props']))
        p.key: _prop(p.value),
    },
  );
  expect(canonicalExpansionValue(args.args), expected['args'], reason: 'args');
  expect(
    args.widgets,
    expected['widgets'] ?? <String, Object?>{},
    reason: 'widgets',
  );
  final CraftRuntime runtime = CraftRuntime(
    registry,
    library: catalog,
    widget: component,
    args: args.args,
  );
  final Expansion expansion = runtime.expand();
  if (expected.containsKey('tree')) {
    expect(expansion.toJson()['root'], expected['tree'], reason: 'tree');
  }
  expect(expansion.errors, isEmpty, reason: 'errors');
  final List<Object?> steps = c['steps'] as List<Object?>? ?? <Object?>[];
  for (int i = 0; i < steps.length; i += 1) {
    final Map<String, Object?> step = steps[i]! as Map<String, Object?>;
    final String label = 'step ${i + 1}';
    assertKnownKeys(step, const <String>{
      'fire',
      'event_args',
      'runnable',
      'expect',
    }, label);
    final Map<String, Object?> want = step['expect']! as Map<String, Object?>;
    if (step['runnable'] case final List<Object?> path) {
      expect(
        <String, Object?>{
          'runnable': isRunnableHandler(_at(expansion.root, path)),
        },
        want,
        reason: label,
      );
      continue;
    }
    final FireResult result = runtime.fire(
      _at(expansion.root, step['fire']! as List<Object?>),
      switch (step['event_args']) {
        final String file => parseDataFile(file),
        _ => const <String, Object?>{},
      },
    );
    expect(
      <String, Object?>{
        'effects': <Object?>[
          for (final HostEvent e in result.events)
            for (final A2uiEffect effect in args.effects(e)) effect.toJson(),
        ],
      },
      want,
      reason: label,
    );
  }
}

/// A prop in the YAML form (see the YAML header); a node is its name.
Object? _prop(Object? spec) => switch (spec) {
  'action' => const ActionProp('action'),
  {'child': final String node} => ChildProp(node),
  {'children': final List<Object?> nodes} => ChildListProp(<Object>[
    for (final Object? n in nodes) n!,
  ]),
  {'value': final Object? value} => BoundValue(
    value,
    path: (spec as Map<String, Object?>)['path'] as String?,
  ),
  _ => spec,
};

Object _at(Object root, List<Object?> path) {
  Object current = root;
  for (final Object? step in path) {
    current = switch (current) {
      WidgetNode() => current.arguments[step]!,
      List<Object>() => current[step! as int],
      Map<String, Object>() => current[step]!,
      _ => throw StateError('Nothing at $path'),
    };
  }
  return current;
}

Iterable<MapEntry<String, Object?>> _entries(Object? map) =>
    (map as Map<String, Object?>?)?.entries ??
    const <MapEntry<String, Object?>>[];

LibraryName _library(String dotted) => LibraryName(dotted.split('.'));

class _Primitives extends PrimitiveLibrary {
  _Primitives(Map<String, Object?> primitives)
    : widgetMeta = <String, Map<String, Object?>>{
        for (final MapEntry<String, Object?> p in primitives.entries)
          p.key: p.value as Map<String, Object?>? ?? const <String, Object?>{},
      };

  @override
  final Map<String, Map<String, Object?>> widgetMeta;

  @override
  Iterable<String> get widgetNames => widgetMeta.keys;
}
