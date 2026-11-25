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
// craft/conformance/craft/craft_functions.yaml cannot express: host function
// registration, values that the text format cannot write (NaN, null, objects
// that are not values), the standard function set, and symbol references
// without a symbol reader.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

const LibraryName _test = LibraryName(<String>['test']);

Object _evaluate(
  Object? value, {
  Map<String, LocalFunction> host = const <String, LocalFunction>{},
  Object? args,
  Object? data,
}) => Evaluator(
  NameResolver(<LibraryName, WidgetLibrary>{
    _test: parseLibraryFile('import core; import fmt;'),
    const LibraryName(<String>['core']): _CorePrimitives(),
  }),
  FunctionRegistry(standard: standardFunctions, host: host),
).evaluate(value, library: _test, args: args, data: data);

ConstructorCall _call(String name, Map<String, Object?> arguments) =>
    ConstructorCall(name, arguments);

void main() {
  group('FunctionRegistry', () {
    LocalFunction echo() => LocalFunction(
      arguments: const <String, FunctionArgType>{'value': FunctionArgType.any},
      implementation: (DynamicMap arguments) => arguments['value'],
    );

    test('accepts host keys qualified with a library other than core', () {
      final FunctionRegistry registry = FunctionRegistry(
        standard: standardFunctions,
        host: <String, LocalFunction>{
          'fmt::price': echo(),
          'acme.ui::format_2': echo(),
        },
      );
      expect(registry.contains('fmt::price'), isTrue);
      expect(registry.contains('acme.ui::format_2'), isTrue);
      expect(registry.contains('add'), isTrue);
    });

    for (final String key in <String>[
      'price',
      'core::price',
      'fmt::absent',
      'fmt::call',
      'fmt::theme',
      'fmt::null',
      'a.switch::price',
      'fmt::a::b',
      '1fmt::price',
      'fmt::',
      '::price',
      'fmt.::price',
      'fmt::pri-ce',
      'fmt::price\n',
    ]) {
      test('rejects the host key ${key.replaceAll('\n', r'\n')}', () {
        expect(
          () => FunctionRegistry(
            standard: standardFunctions,
            host: <String, LocalFunction>{key: echo()},
          ),
          throwsArgumentError,
        );
      });
    }
  });

  group('standard functions', () {
    test('are exactly the functions the blueprint lists', () {
      expect(standardFunctions.keys.toSet(), <String>{
        'add',
        'subtract',
        'multiply',
        'divide',
        'mod',
        'min',
        'max',
        'abs',
        'round',
        'floor',
        'ceil',
        'greaterThan',
        'lessThan',
        'greaterThanOrEqual',
        'lessThanOrEqual',
        'equals',
        'notEquals',
        'and',
        'or',
        'not',
        'concat',
        'trim',
        'length',
        'contains',
        'listWith',
        'listWithout',
        'isSet',
        'orElse',
      });
    });

    test('absent is a literal, not a function', () {
      final FunctionRegistry registry = FunctionRegistry(
        standard: standardFunctions,
      );
      final Map<String, String> visible = NameResolver(
        <LibraryName, WidgetLibrary>{_test: parseLibraryFile('import core;')},
      ).visibleFunctions(_test, registry.keys);
      expect(visible, contains('core::isSet'));
      expect(visible.keys, isNot(contains('absent')));
      expect(visible.keys, isNot(contains('core::absent')));
      expect(_evaluate(_call('absent', const <String, Object?>{})), missing);
    });

    test('core::absent and core::call name nothing', () {
      for (final String name in <String>['core::absent', 'core::call']) {
        expect(
          () => _evaluate(_call(name, const <String, Object?>{})),
          throwsA(
            isA<EvaluationException>().having(
              (EvaluationException e) => e.kind,
              'kind',
              EvaluationErrorKind.unknownFunction,
            ),
          ),
          reason: name,
        );
      }
    });
  });

  group('NaN', () {
    test('is not a number', () {
      for (final String name in <String>['add', 'min', 'greaterThan']) {
        expect(
          _evaluate(_call(name, <String, Object?>{'a': double.nan, 'b': 1})),
          missing,
          reason: name,
        );
      }
      expect(
        _evaluate(_call('round', <String, Object?>{'value': double.nan})),
        missing,
      );
    });

    test('equals nothing, not even itself', () {
      expect(
        _evaluate(
          _call('equals', <String, Object?>{'a': double.nan, 'b': double.nan}),
        ),
        isFalse,
      );
      expect(
        _evaluate(
          _call('contains', <String, Object?>{
            'list': <Object?>[double.nan],
            'value': double.nan,
          }),
        ),
        isFalse,
      );
    });

    test('is a value for any and displays as NaN', () {
      expect(
        _evaluate(_call('isSet', <String, Object?>{'value': double.nan})),
        isTrue,
      );
      expect(
        _evaluate(_call('concat', <String, Object?>{'a': double.nan})),
        'NaN',
      );
    });
  });

  group('nodes left to the runtime', () {
    Object? valueOf(String expression) =>
        (parseLibraryFile(
                  'import core; widget test = Result(value: $expression);',
                ).widgets.single.root
                as ConstructorCall)
            .arguments['value'];

    for (final String expression in <String>[
      'Text(text: "x")',
      '[...for x in data.l: x]',
      '[...if true: 1]',
      'switch args.a { default: 1 }',
      '(s) => Text(text: s.x)',
      'event "tap" {}',
      'set state.a = 1',
      'call args.h {}',
      'theme.color',
      'Text.version',
      'isSet(value: Text(text: "x"))',
    ]) {
      test('$expression is notEvaluated by this evaluator', () {
        expect(
          () => _evaluate(valueOf(expression)),
          throwsA(
            isA<EvaluationException>().having(
              (EvaluationException e) => e.kind,
              'kind',
              EvaluationErrorKind.notEvaluated,
            ),
          ),
        );
      });
    }

    test('a root call() is notEvaluated', () {
      expect(
        () => _evaluate(
          parseLibraryFile('widget r = call();').widgets.single.root,
        ),
        throwsA(
          isA<EvaluationException>().having(
            (EvaluationException e) => e.kind,
            'kind',
            EvaluationErrorKind.notEvaluated,
          ),
        ),
      );
    });
  });

  group('supplied values', () {
    test('a map with dynamic keys that are all strings is a value', () {
      final Map<dynamic, dynamic> map = <dynamic, dynamic>{
        'k': <dynamic, dynamic>{'x': 1},
      };
      expect(
        _evaluate(
          const DataReference(<Object>['m']),
          data: <String, Object?>{'m': map},
        ),
        <String, Object>{
          'k': <String, Object>{'x': 1},
        },
      );
      expect(
        _evaluate(
          const DataReference(<Object>['m', 'k', 'x']),
          data: <dynamic, dynamic>{'m': map},
        ),
        1,
      );
    });

    test('null is absent', () {
      final Map<String, Object?> args = <String, Object?>{
        'a': null,
        'l': <Object?>[null, 1],
        'm': <String, Object?>{'k': null},
      };
      expect(
        _evaluate(const ArgsReference(<Object>['a']), args: args),
        missing,
      );
      expect(
        _evaluate(const ArgsReference(<Object>['l']), args: args),
        <Object>[missing, 1],
      );
      expect(
        _evaluate(const ArgsReference(<Object>['m']), args: args),
        <String, Object>{'k': missing},
      );
      expect(
        _evaluate(
          _call('isSet', <String, Object?>{
            'value': const ArgsReference(<Object>['m', 'k']),
          }),
          args: args,
        ),
        isFalse,
      );
    });

    test('anything else than a value read by a reference is a host error', () {
      final Map<String, Object?> args = <String, Object?>{
        'date': DateTime(2026),
        'nested': <Object?>[1, Object()],
        'intKeys': <int, Object?>{1: 'a'},
        'fine': 'x',
      };
      for (final List<Object> parts in <List<Object>>[
        <Object>['date'],
        <Object>['date', 'x'],
        <Object>['nested'],
        <Object>['intKeys'],
        <Object>['intKeys', 'x'],
      ]) {
        expect(
          () => _evaluate(ArgsReference(parts), args: args),
          throwsFormatException,
          reason: '$parts',
        );
      }
      expect(_evaluate(const ArgsReference(<Object>['fine']), args: args), 'x');
    });

    test('a function receives copies', () {
      final List<Object?> list = <Object?>['a'];
      final Object result = _evaluate(
        _call('fmt::grow', <String, Object?>{
          'l': const DataReference(<Object>['l']),
        }),
        data: <String, Object?>{'l': list},
        host: <String, LocalFunction>{
          'fmt::grow': LocalFunction(
            arguments: const <String, FunctionArgType>{
              'l': FunctionArgType.list,
            },
            implementation: (DynamicMap arguments) =>
                (arguments['l']! as List<Object?>)..add('b'),
          ),
        },
      );
      expect(result, <Object?>['a', 'b']);
      expect(list, <Object?>['a']);
    });
  });

  group('host functions', () {
    test('any thrown object is functionFailed', () {
      for (final Object thrown in <Object>[
        const FormatException('x'),
        ArgumentError('x'),
        'a string',
      ]) {
        expect(
          () => _evaluate(
            _call('fmt::f', const <String, Object?>{}),
            host: <String, LocalFunction>{
              'fmt::f': LocalFunction(
                arguments: const <String, FunctionArgType>{},
                implementation: (DynamicMap arguments) => throw thrown,
              ),
            },
          ),
          throwsA(
            isA<EvaluationException>().having(
              (EvaluationException e) => e.kind,
              'kind',
              EvaluationErrorKind.functionFailed,
            ),
          ),
        );
      }
    });
  });

  test('symbol references need a symbol reader', () {
    const SymbolReference symbol = SymbolReference('Text', <Object>['version']);
    expect(
      () => _evaluate(symbol),
      throwsA(
        isA<EvaluationException>().having(
          (EvaluationException e) => e.kind,
          'kind',
          EvaluationErrorKind.notEvaluated,
        ),
      ),
    );
    final Evaluator reading = Evaluator(
      NameResolver(<LibraryName, WidgetLibrary>{}),
      FunctionRegistry(standard: standardFunctions),
      symbols: (LibraryName library, SymbolReference reference) =>
          '$library:${reference.symbol}.${reference.parts.join('.')}',
    );
    expect(reading.evaluate(<Object?>[symbol], library: _test), <Object>[
      'test:Text.version',
    ]);
  });

  test('the missing value of a decoded library is absent', () {
    expect(_evaluate(<Object?>[missing]), <Object>[missing]);
    expect(
      _evaluate(_call('isSet', <String, Object?>{'value': missing})),
      isFalse,
    );
  });

  group('numberToDisplayString', () {
    test('one rendering on every engine', () {
      expect(numberToDisplayString(4.0), '4');
      expect(numberToDisplayString(7), '7');
      expect(numberToDisplayString(2.5), '2.5');
      expect(numberToDisplayString(-0.0), '0');
      expect(numberToDisplayString(1e20), '100000000000000000000');
      expect(numberToDisplayString(1e24), '1e+24');
      expect(numberToDisplayString(1e-7), '1e-7');
      expect(
        numberToDisplayString(-9223372036854775808),
        '-9223372036854775808',
      );
    });
  });
}

class _CorePrimitives extends PrimitiveLibrary {
  @override
  List<String> get widgetNames => const <String>['Text'];

  @override
  Map<String, Map<String, Object?>> get widgetMeta =>
      const <String, Map<String, Object?>>{'Text': <String, Object?>{}};
}
