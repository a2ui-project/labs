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

// Runs the conformance suite of the craft_functions feature
// (craft/conformance/craft/craft_functions.yaml). The YAML header documents
// the case format, the primitive libraries and the test host functions.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

import 'conformance_harness.dart';

/// The keys of a case's library and value, for both actions.
const Set<String> _libraryKeys = <String>{
  'expression',
  'expressions',
  'source',
  'core',
  'imports',
  'library_name',
  'declaration',
  'evaluate',
  'primitives',
  'expect',
};

void main() {
  runConformanceSuite('craft/craft_functions.yaml', <String, ConformanceAction>{
    'evaluate': ConformanceAction(
      const <String>{..._libraryKeys, 'args', 'data', 'state'},
      (ConformanceTestCase c) => _run(c, classify: false),
      variants: ('expressions', 'expression'),
    ),
    'classify': ConformanceAction(
      _libraryKeys,
      (ConformanceTestCase c) => _run(c, classify: true),
      variants: ('expressions', 'expression'),
    ),
  });
}

/// The test host functions described in the YAML header.
final Map<String, LocalFunction> testHostFunctions = <String, LocalFunction>{
  'fmt::echo': LocalFunction(
    arguments: const <String, FunctionArgType>{'value': FunctionArgType.any},
    implementation: (DynamicMap arguments) => arguments['value'],
  ),
  'fmt::kinds': LocalFunction(
    arguments: const <String, FunctionArgType>{
      'n': FunctionArgType.number,
      's': FunctionArgType.string,
      'b': FunctionArgType.boolean,
      'l': FunctionArgType.list,
      'x': FunctionArgType.any,
    },
    implementation: (DynamicMap arguments) => <String, Object?>{...arguments},
  ),
  'fmt::fail': LocalFunction(
    arguments: const <String, FunctionArgType>{'n': FunctionArgType.number},
    implementation: (DynamicMap arguments) => throw StateError('fails'),
  ),
  'fmt::bad': LocalFunction(
    arguments: const <String, FunctionArgType>{
      'nested': FunctionArgType.boolean,
    },
    implementation: (DynamicMap arguments) =>
        arguments['nested'] == true ? <Object?>[1, Object()] : Object(),
  ),
  'fmt::nothing': LocalFunction(
    arguments: const <String, FunctionArgType>{},
    implementation: (DynamicMap arguments) => null,
  ),
  'fmt::nulls': LocalFunction(
    arguments: const <String, FunctionArgType>{},
    implementation: (DynamicMap arguments) => <Object?>[
      null,
      <String, Object?>{'a': null},
    ],
  ),
  'fmt::Badge': LocalFunction(
    arguments: const <String, FunctionArgType>{'value': FunctionArgType.any},
    implementation: (DynamicMap arguments) => 'function',
  ),
};

const Map<String, Object?> _defaultPrimitives = <String, Object?>{
  'core': <Object?>['Text', 'Column'],
  'fmt': <Object?>['Badge'],
};

void _run(ConformanceTestCase c, {required bool classify}) {
  final String? expression = c['expression'] as String?;
  final Map<String, Object?> expected = c['expect']! as Map<String, Object?>;
  final String source =
      c['source'] as String? ??
      <String>[
        if (c['core'] != false) 'import core;',
        for (final Object? import in c['imports'] as List<Object?>? ?? [])
          'import $import;',
        'widget test = Result(value: $expression);',
      ].join('\n');
  final LibraryName name = _library(c['library_name'] as String? ?? 'test');
  final RemoteWidgetLibrary library = parseLibraryFile(source);
  final Map<LibraryName, WidgetLibrary> libraries =
      <LibraryName, WidgetLibrary>{
        for (final MapEntry<String, Object?> entry
            in (c['primitives'] as Map<String, Object?>? ?? _defaultPrimitives)
                .entries)
          _library(entry.key): _Primitives(<String>[
            for (final Object? widget in entry.value! as List<Object?>)
              widget! as String,
          ]),
        name: library,
      };
  final String declarationName = c['declaration'] as String? ?? 'test';
  final WidgetDeclaration declaration = library.widgets.singleWhere(
    (WidgetDeclaration d) => d.name == declarationName,
  );
  final Object? value = c['evaluate'] == 'root'
      ? declaration.root
      : (declaration.root as ConstructorCall).arguments['value'];
  Object? input(String key) =>
      c[key] == null ? null : parseDataFile(c[key]! as String);

  final Evaluator evaluator = Evaluator(
    NameResolver(libraries),
    FunctionRegistry(standard: standardFunctions, host: testHostFunctions),
  );
  if (classify) {
    assertKnownKeys(expected, const <String>{'classify'}, 'expect');
    final CallKind kind = evaluator.classify(
      (value! as ConstructorCall).name,
      library: name,
      declaration: declarationName,
    );
    expect(<String, Object?>{'classify': _kind(kind)}, expected);
    return;
  }
  Object? evaluate() => canonicalValue(
    evaluator.evaluate(
      value,
      library: name,
      declaration: declarationName,
      args: input('args'),
      data: input('data'),
      state: input('state'),
    ),
  );

  assertKnownKeys(expected, const <String>{'value', 'error'}, 'expect');
  if (expected['error'] case final String kind) {
    expect(
      evaluate,
      throwsA(
        isA<EvaluationException>().having(
          (EvaluationException e) => e.kind.name,
          'kind',
          kind,
        ),
      ),
    );
    return;
  }
  expect(expected.keys, <String>['value'], reason: 'expect has one key');
  expect(evaluate(), expected['value']);
}

Object _kind(CallKind kind) => switch (kind) {
  AbsentCall() => 'absent',
  HandlerApplication() => 'handler',
  WidgetCall(:final ResolvedName widget) => <String, Object?>{
    'widget': '${widget.library}::${widget.name}',
  },
  FunctionCall(:final String key) => <String, Object?>{'function': key},
  UnknownCall() => 'unknown',
};

LibraryName _library(String dotted) => LibraryName(dotted.split('.'));

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
