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

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

import 'conformance_harness.dart';

/// The handler of resolve_names (see craft_libraries_and_names.yaml).
const ConformanceAction resolveNamesAction = ConformanceAction(<String>{
  'libraries',
  'primitives',
  'queries',
}, _run);

/// The keys of each kind of query, besides `query` and `expect`.
const Map<String, Set<String>> _queryKeys = <String, Set<String>>{
  'resolve': <String>{'from', 'name', 'excluding'},
  'resolveImported': <String>{'from', 'name'},
  'catalogComponent': <String>{'catalog', 'name'},
  'functionKey': <String>{'from', 'name', 'functions'},
  'visibleFunctions': <String>{'from', 'functions'},
  'visibleNames': <String>{'from'},
};

/// Registers the case's libraries and checks each of its queries.
void _run(ConformanceTestCase c) {
  final Map<LibraryName, WidgetLibrary> libraries =
      <LibraryName, WidgetLibrary>{
        for (final MapEntry<String, Object?> entry
            in (c['libraries'] as Map<String, Object?>? ??
                    const <String, Object?>{})
                .entries)
          _library(entry.key): parseLibraryFile(entry.value! as String),
        for (final MapEntry<String, Object?> entry
            in (c['primitives'] as Map<String, Object?>? ??
                    const <String, Object?>{})
                .entries)
          _library(entry.key): _Primitives(
            (entry.value! as List<Object?>).cast<String>(),
          ),
      };
  final NameResolver resolver = NameResolver(libraries);
  for (final Object? q in c['queries']! as List<Object?>) {
    final Map<String, Object?> query = q! as Map<String, Object?>;
    final Set<String>? keys = _queryKeys[query['query']];
    if (keys == null) throw StateError('Unknown query: $query');
    assertKnownKeys(query, <String>{'query', 'expect', ...keys}, '$query');
    final String? name = query['name'] as String?;
    final List<String> functions = <String>[
      ...?(query['functions'] as List<Object?>?)?.cast<String>(),
    ];
    LibraryName from() => _library(query['from']! as String);
    final Object actual = switch (query['query']) {
      'resolve' => _result(
        resolver.resolve(
          from(),
          name!,
          excluding: query['excluding'] as String?,
        ),
      ),
      'resolveImported' => _result(resolver.resolveImported(from(), name!)),
      'catalogComponent' => _result(
        resolver.resolveCatalogComponent(
          _library(query['catalog']! as String),
          name!,
        ),
      ),
      'functionKey' => <String, Object?>{
        'key': resolver.functionKey(from(), name!, functions.contains),
      },
      'visibleFunctions' => resolver.visibleFunctions(from(), functions),
      'visibleNames' => <String, Object?>{
        for (final MapEntry<String, NameResolution> entry
            in resolver.visibleNames(from()).entries)
          entry.key: _result(entry.value),
      },
      final Object? kind => throw StateError('Unknown query: $kind'),
    };
    expect(actual, query['expect'], reason: '$query');
  }
}

LibraryName _library(String dotted) => LibraryName(dotted.split('.'));

Map<String, Object?> _result(NameResolution resolution) => switch (resolution) {
  ResolvedName() => <String, Object?>{
    'library': resolution.library.toString(),
    'name': resolution.name,
    'kind': resolution.isPrimitive ? 'primitive' : 'template',
  },
  UnresolvedName() => <String, Object?>{'error': resolution.reason.name},
};

class _Primitives extends PrimitiveLibrary {
  _Primitives(this.widgetNames);

  @override
  final List<String> widgetNames;

  @override
  Map<String, Map<String, Object?>> get widgetMeta =>
      <String, Map<String, Object?>>{
        for (final String name in widgetNames) name: const <String, Object?>{},
      };
}
