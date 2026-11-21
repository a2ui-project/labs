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

// The expand_template action (see craft_runtime.yaml), which the suites of
// later features share.

import 'dart:convert';

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

import 'conformance_harness.dart';

const Map<String, Object?> _defaultPrimitives = <String, Object?>{
  'core': <String, Object?>{
    'Column': null,
    'Row': null,
    'Text': null,
    'Button': null,
    'Box': null,
    'List': null,
  },
};

/// The handler of expand_template (see craft_runtime.yaml).
final ConformanceAction expandTemplateAction = ConformanceAction(const <String>{
  'primitives',
  'libraries',
  'root',
  'args',
  'host_handlers',
  'host_widgets',
  'data',
  'data_json',
  'expect',
  'steps',
}, (ConformanceTestCase c) => RuntimeEngine(c).run(c));

/// One registry and runtime set up by a case in the format of
/// `craft_runtime.yaml` (its header documents it).
class RuntimeEngine {
  /// Sets up the registry and runtime of [c].
  RuntimeEngine(ConformanceTestCase c) {
    for (final MapEntry<String, Object?> p in _entries(
      c['primitives'] ?? _defaultPrimitives,
    )) {
      registry.setPrimitiveLibrary(
        _library(p.key),
        _Primitives(p.value! as Map<String, Object?>),
      );
    }
    registry.setHostFunctions(
      const LibraryName(<String>['fmt']),
      <String, LocalFunction>{
        'fail': LocalFunction(
          arguments: const <String, FunctionArgType>{},
          implementation: (DynamicMap arguments) =>
              throw StateError('fmt::fail always fails'),
        ),
      },
    );
    _register(c['libraries']);
    final Map<String, Object?> root =
        c['root'] as Map<String, Object?>? ?? const <String, Object?>{};
    runtime = CraftRuntime(
      registry,
      library: _library(root['library'] as String? ?? 'main'),
      widget: root['widget'] as String? ?? 'root',
      args: _args(c['args'], c['host_handlers'], c['host_widgets']),
      data: c['data_json'] ?? _data(c['data']),
    );
  }

  /// Checks the initial expansion against `expect`, then runs the steps.
  void run(ConformanceTestCase c) {
    final Map<String, Object?> expected = c['expect']! as Map<String, Object?>;
    assertKnownKeys(expected, _expansionKeys, 'expect');
    checkRoot(expected, 'initial expansion');
    final List<Object?> steps = c['steps'] as List<Object?>? ?? <Object?>[];
    for (int i = 0; i < steps.length; i += 1) {
      step(steps[i]! as Map<String, Object?>, 'step ${i + 1}');
    }
  }

  final TemplateRegistry registry = TemplateRegistry();
  late final CraftRuntime runtime;
  Expansion? _current;
  Expansion? _previous;
  final Map<String, Expansion> _builds = <String, Expansion>{};

  void _register(Object? libraries) {
    for (final MapEntry<String, Object?> l in _entries(libraries)) {
      registry.setTemplateLibrary(
        _library(l.key),
        parseLibraryFile(l.value! as String),
      );
    }
  }

  void step(Map<String, Object?> step, String label) {
    assertKnownKeys(step, _stepKeys, label);
    final Map<String, Object?> expected =
        step['expect']! as Map<String, Object?>;
    assertKnownKeys(expected, _stepExpectKeys, '$label: expect');
    if (step.containsKey('fire')) {
      final FireResult result = runtime.fire(
        _at(
          step['fire']! as List<Object?>,
          from: step['in'] == 'previous' ? _previous! : _current!,
        ),
        _data(step['event_args']) as Map<String, Object?>? ??
            const <String, Object?>{},
      );
      expect(
        <Object?>[for (final HostEvent e in result.events) _event(e)],
        expected['events'] ?? <Object?>[],
        reason: '$label: events',
      );
      expect(
        <Object?>[for (final FireError e in result.errors) e.kind.name],
        expected['fire_errors'] ?? <Object?>[],
        reason: '$label: fire errors',
      );
    } else if (step.containsKey('build')) {
      final List<Object?> path = step['build']! as List<Object?>;
      final BuilderNode builder = _at(path) as BuilderNode;
      final Object key = step['key']!;
      final Expansion output = runtime.expandBuilder(
        builder,
        key,
        _data(step['arg']),
      );
      _builds[jsonEncode(<Object?>[...path, key])] = output;
      check(output, expected, label);
      return;
    } else if (step.containsKey('runnable')) {
      expect(
        <String, Object?>{
          'runnable': isRunnableHandler(
            _at(step['runnable']! as List<Object?>),
          ),
        },
        expected,
        reason: label,
      );
      return;
    } else if (step.containsKey('data')) {
      runtime.data = _data(step['data']);
    } else if (step.containsKey('args')) {
      runtime.args = _args(
        step['args'],
        step['host_handlers'],
        step['host_widgets'],
      );
    } else if (step.containsKey('register')) {
      _register(step['register']);
      runtime.refresh();
    } else {
      throw StateError('Unknown step: $step');
    }
    checkRoot(expected, label);
  }

  /// Expands the root, keeps the result for paths, and checks it.
  void checkRoot(Map<String, Object?> expected, String label) {
    _previous = _current;
    _current = runtime.expand();
    check(_current!, expected, label);
  }

  /// Checks an expansion; `states` and `errors` default to none.
  void check(Expansion expansion, Map<String, Object?> expected, String label) {
    final Map<String, Object?> actual = expansion.toJson();
    if (expected.containsKey('tree')) {
      expect(actual['root'], expected['tree'], reason: '$label: tree');
    }
    expect(
      actual['states'],
      expected['states'] ?? <Object?>[],
      reason: '$label: states',
    );
    expect(
      actual['errors'],
      expected['errors'] ?? <Object?>[],
      reason: '$label: errors',
    );
  }

  /// The node or value at [path] of the last root expansion, continuing into
  /// the last output built for a builder and key.
  Object _at(List<Object?> path, {Expansion? from}) {
    Object current = (from ?? _current!).root;
    for (int i = 0; i < path.length; i += 1) {
      final Object step = path[i]!;
      current =
          switch (current) {
            WidgetNode() => current.arguments[step],
            List<Object>() => current[step as int],
            Map<String, Object>() => current[step],
            BuilderNode() =>
              _builds[jsonEncode(<Object?>[...current.path, step])]?.root,
            _ => null,
          } ??
          (throw StateError('Nothing at ${path.sublist(0, i + 1)}'));
    }
    return current;
  }
}

const Set<String> _expansionKeys = <String>{'tree', 'states', 'errors'};

const Set<String> _stepKeys = <String>{
  'fire',
  'in',
  'event_args',
  'data',
  'args',
  'host_handlers',
  'host_widgets',
  'register',
  'build',
  'key',
  'arg',
  'runnable',
  'expect',
};

const Set<String> _stepExpectKeys = <String>{
  ..._expansionKeys,
  'events',
  'fire_errors',
  'runnable',
};

Object? _event(HostEvent event) => switch (event) {
  TemplateEvent() => <String, Object?>{
    'event': event.name,
    'args': canonicalValue(event.arguments),
  },
  HostHandlerEvent() => <String, Object?>{
    'hostHandler': event.handler.id,
    'args': canonicalValue(event.arguments),
  },
};

Map<String, Object?> _args(Object? source, Object? handlers, Object? widgets) =>
    <String, Object?>{
      ...?_data(source) as Map<String, Object?>?,
      for (final MapEntry<String, Object?> h in _entries(handlers))
        h.key: HostHandler(h.value! as String),
      for (final MapEntry<String, Object?> w in _entries(widgets))
        w.key: switch (w.value) {
          final List<Object?> ids => <Object?>[
            for (final Object? id in ids) HostWidget(id! as String),
          ],
          final Object? id => HostWidget(id! as String),
        },
    };

Object? _data(Object? source) =>
    source == null ? null : parseDataFile(source as String);

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
