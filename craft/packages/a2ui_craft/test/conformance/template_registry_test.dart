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

// Runs the conformance suite of the craft_template_registry feature
// (craft/conformance/craft/craft_template_registry.yaml). The YAML header
// documents the case format.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

import 'conformance_harness.dart';

void main() {
  runConformanceSuite(
    'craft/craft_template_registry.yaml',
    <String, ConformanceAction>{
      'update_registry': ConformanceAction(
        const <String>{'register', 'changes'},
        (ConformanceTestCase c) {
          final _Engine engine = _Engine();
          engine.step(c['register']! as Map<String, Object?>);
          for (final Object? change in c['changes'] as List<Object?>? ?? []) {
            engine.step(change! as Map<String, Object?>);
          }
        },
      ),
    },
  );
}

/// A registry and the parsed sources of its template libraries.
class _Engine {
  final TemplateRegistry registry = TemplateRegistry();
  final Map<LibraryName, RemoteWidgetLibrary> sources =
      <LibraryName, RemoteWidgetLibrary>{};

  /// Applies one registration step and runs its queries.
  void step(Map<String, Object?> step) {
    assertKnownKeys(step, const <String>{
      'primitives',
      'functions',
      'libraries',
      'dependencies',
      'remove_libraries',
      'remove_functions',
      'app_version',
      'rejected',
      'queries',
    }, 'step');
    final List<void Function()> registrations = <void Function()>[
      for (final MapEntry<String, Object?> p in _entries(step['primitives']))
        () => registry.setPrimitiveLibrary(
          _library(p.key),
          _Primitives(p.value! as Map<String, Object?>),
        ),
      for (final MapEntry<String, Object?> f in _entries(step['functions']))
        () =>
            registry.setHostFunctions(_library(f.key), <String, LocalFunction>{
              for (final MapEntry<String, Object?> function in _entries(
                f.value,
              ))
                function.key: _function(function.value),
            }),
      for (final MapEntry<String, Object?> l in _entries(step['libraries']))
        () {
          final RemoteWidgetLibrary library = parseLibraryFile(
            l.value! as String,
          );
          registry.setTemplateLibrary(
            _library(l.key),
            library,
            dependencies: _dependencies(
              (step['dependencies'] as Map<String, Object?>?)?[l.key],
            ),
          );
          sources[_library(l.key)] = library;
        },
      for (final Object? name
          in step['remove_libraries'] as List<Object?>? ?? [])
        () => registry.removeLibrary(_library(name! as String)),
      for (final Object? name
          in step['remove_functions'] as List<Object?>? ?? [])
        () => registry.removeHostFunctions(_library(name! as String)),
      if (step['app_version'] case final String version)
        () => registry.appVersion = version,
    ];
    if (step['rejected'] == true) {
      expect(
        registrations,
        hasLength(1),
        reason: 'a rejected step registers once',
      );
      expect(registrations.single, throwsArgumentError);
    } else {
      for (final void Function() register in registrations) {
        register();
      }
    }
    for (final Object? q in step['queries'] as List<Object?>? ?? []) {
      query(q! as Map<String, Object?>);
    }
  }

  void query(Map<String, Object?> query) {
    assertKnownKeys(query, const <String>{
      'evaluate',
      'declaration',
      'availability',
      'offered',
      'expect',
    }, 'query');
    final Object? expected = query['expect'];
    if (query['evaluate'] case final String libraryName) {
      final LibraryName library = _library(libraryName);
      final String declaration = query['declaration'] as String? ?? 'probe';
      final Object root = sources[library]!.widgets
          .singleWhere((WidgetDeclaration d) => d.name == declaration)
          .root;
      Object? evaluate() => canonicalValue(
        registry.evaluate(
          (root as ConstructorCall).arguments['value'],
          library: library,
          declaration: declaration,
        ),
      );
      final Map<String, Object?> expectation =
          expected! as Map<String, Object?>;
      if (expectation.containsKey('classify')) {
        final Object? value = (root as ConstructorCall).arguments['value'];
        final CallKind kind = registry.classify(
          (value! as ConstructorCall).name,
          library: library,
          declaration: declaration,
        );
        expect(<String, Object?>{'classify': _kind(kind)}, expectation);
      } else if (expectation['error'] case final String kind) {
        expect(
          evaluate,
          throwsA(
            isA<EvaluationException>().having(
              (EvaluationException e) => e.kind.name,
              'kind',
              kind,
            ),
          ),
          reason: '$query',
        );
      } else {
        expect(expectation.keys, <String>['value'], reason: 'one key');
        expect(evaluate(), expectation['value'], reason: '$query');
      }
    } else if (query['availability'] case final String library) {
      expect(
        _availability(registry.availability(_library(library))),
        expected,
        reason: '$query',
      );
    } else if (query['offered'] case final String library) {
      expect(
        registry.offeredComponents(_library(library)),
        expected,
        reason: '$query',
      );
    } else {
      throw StateError('Unknown query: $query');
    }
  }
}

Object? _availability(LibraryAvailability? availability) => availability == null
    ? null
    : <String, Object?>{
        'available': availability.available,
        'unmet': <Object?>[
          for (final Requirement r in availability.unmet) r.toJson(),
        ],
        'components': <String, Object?>{
          for (final MapEntry<String, ComponentAvailability> c
              in availability.components.entries)
            c.key: <String, Object?>{
              'available': c.value.available,
              'unmet': <Object?>[
                for (final Requirement r in c.value.unmet) r.toJson(),
              ],
            },
        },
      };

Object _kind(CallKind kind) => switch (kind) {
  AbsentCall() => 'absent',
  HandlerApplication() => 'handler',
  WidgetCall(:final ResolvedName widget) => <String, Object?>{
    'widget': '${widget.library}::${widget.name}',
  },
  FunctionCall(:final String key) => <String, Object?>{'function': key},
  UnknownCall() => 'unknown',
};

LibraryDependencies _dependencies(Object? spec) {
  if (spec == null) return const LibraryDependencies();
  final Map<String, Object?> map = spec as Map<String, Object?>;
  return LibraryDependencies(
    optional: <LibraryName>{
      for (final Object? name in map['optional'] as List<Object?>? ?? [])
        _library(name! as String),
    },
    requires: _requirements(map['requires']),
    components: <String, List<HostRequirement>>{
      for (final MapEntry<String, Object?> c in _entries(map['components']))
        c.key: _requirements(c.value),
    },
  );
}

List<HostRequirement> _requirements(Object? spec) => <HostRequirement>[
  for (final Object? r in spec as List<Object?>? ?? [])
    switch (r! as Map<String, Object?>) {
      {'widget': final String name} => WidgetRequirement(
        name,
        arg: (r as Map<String, Object?>)['arg'] as String?,
      ),
      {'function': final String name} => FunctionRequirement(
        name,
        arg: (r as Map<String, Object?>)['arg'] as String?,
      ),
      _ => throw StateError('Unknown requirement: $r'),
    },
];

LocalFunction _function(Object? parameters) => LocalFunction(
  arguments: <String, FunctionArgType>{
    for (final MapEntry<String, Object?> p in _entries(parameters))
      p.key: FunctionArgType.values.byName(p.value! as String),
  },
  implementation: (DynamicMap arguments) => null,
);

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
