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

import 'functions.dart';
import 'rfw/model.dart';

/// The standard functions, which every engine offers under these names (see
/// the `craft_functions` blueprint for each one's meaning).
///
/// Absent arguments reach the implementations as [missing]; a present
/// argument of the wrong kind never does (see [FunctionArgType]).
final Map<String, LocalFunction> standardFunctions =
    Map<String, LocalFunction>.unmodifiable(<String, LocalFunction>{
      'add': _binaryNumber(_add),
      'subtract': _binaryNumber(_subtract),
      'multiply': _binaryNumber(_multiply),
      'divide': _binaryNumber(
        (num a, num b) => b == 0 ? null : a.toDouble() / b.toDouble(),
      ),
      'mod': _binaryNumber(_mod),
      'min': _binaryNumber((num a, num b) => compareNumbers(a, b) <= 0 ? a : b),
      'max': _binaryNumber((num a, num b) => compareNumbers(a, b) >= 0 ? a : b),
      'abs': _unaryNumber(
        (num a) => a is int ? (a == _minInt ? null : a.abs()) : a.abs(),
      ),
      'round': _unaryNumber(
        (num a) => _toInteger(a, (double d) => d.roundToDouble()),
      ),
      'floor': _unaryNumber(
        (num a) => _toInteger(a, (double d) => d.floorToDouble()),
      ),
      'ceil': _unaryNumber(
        (num a) => _toInteger(a, (double d) => d.ceilToDouble()),
      ),
      'greaterThan': _comparison((int c) => c > 0),
      'lessThan': _comparison((int c) => c < 0),
      'greaterThanOrEqual': _comparison((int c) => c >= 0),
      'lessThanOrEqual': _comparison((int c) => c <= 0),
      'equals': _equality(wantEqual: true),
      'notEquals': _equality(wantEqual: false),
      'and': _binaryBoolean((bool a, bool b) => a && b),
      'or': _binaryBoolean((bool a, bool b) => a || b),
      'not': LocalFunction(
        arguments: const <String, FunctionArgType>{
          'value': FunctionArgType.boolean,
        },
        implementation: (DynamicMap arguments) => switch (arguments['value']) {
          final bool value => !value,
          _ => null,
        },
      ),
      'concat': LocalFunction(
        arguments: _twoAny,
        implementation: (DynamicMap arguments) =>
            '${_display(arguments['a'])}${_display(arguments['b'])}',
      ),
      'trim': _unaryString((String s) => s.trim()),
      'length': _unaryString((String s) => s.length),
      'contains': _listFunction(
        (List<Object?> list, Object value) =>
            value is! Missing && _has(list, value),
      ),
      'listWith': _listFunction(
        (List<Object?> list, Object value) =>
            value is Missing || _has(list, value)
            ? <Object?>[...list]
            : <Object?>[...list, value],
      ),
      'listWithout': _listFunction(
        (List<Object?> list, Object value) => value is Missing
            ? <Object?>[...list]
            : <Object?>[
                for (final Object? e in list)
                  if (!valueEquals(e ?? missing, value)) e,
              ],
      ),
      'isSet': LocalFunction(
        arguments: const <String, FunctionArgType>{
          'value': FunctionArgType.any,
        },
        implementation: (DynamicMap arguments) =>
            arguments['value'] is! Missing,
      ),
      'orElse': LocalFunction(
        arguments: const <String, FunctionArgType>{
          'value': FunctionArgType.any,
          'otherwise': FunctionArgType.any,
        },
        implementation: (DynamicMap arguments) => arguments['value'] is Missing
            ? arguments['otherwise']
            : arguments['value'],
      ),
    });

const Map<String, FunctionArgType> _twoNumbers = <String, FunctionArgType>{
  'a': FunctionArgType.number,
  'b': FunctionArgType.number,
};
const Map<String, FunctionArgType> _twoAny = <String, FunctionArgType>{
  'a': FunctionArgType.any,
  'b': FunctionArgType.any,
};

// --- Numbers -----------------------------------------------------------------

const int _minInt = -0x8000000000000000;
final BigInt _minBig = BigInt.from(_minInt);
// Computed, not a literal: dart2js rejects integer literals a double cannot
// hold exactly.
final BigInt _maxBig = (BigInt.one << 63) - BigInt.one;

/// 2^63 as a double: the first double above the 64-bit integer range.
const double _twoTo63 = 9223372036854775808.0;

/// An exact integer result, or null when it does not fit in 64 bits.
int? _fit(BigInt exact) =>
    exact < _minBig || exact > _maxBig ? null : exact.toInt();

num? _add(num a, num b) => a is int && b is int
    ? _fit(BigInt.from(a) + BigInt.from(b))
    : a.toDouble() + b.toDouble();

num? _subtract(num a, num b) => a is int && b is int
    ? _fit(BigInt.from(a) - BigInt.from(b))
    : a.toDouble() - b.toDouble();

num? _multiply(num a, num b) => a is int && b is int
    ? _fit(BigInt.from(a) * BigInt.from(b))
    : a.toDouble() * b.toDouble();

/// The remainder of truncating division, made non-negative by adding |b|.
num? _mod(num a, num b) {
  if (b == 0) return null;
  if (a is int && b is int) return a % b;
  return a.toDouble() % b.toDouble();
}

/// [a] itself if it is an integer, else [a] rounded by [round] if the result
/// is finite and fits in 64 bits.
int? _toInteger(num a, double Function(double) round) {
  if (a is int) return a;
  final double rounded = round(a as double);
  if (!rounded.isFinite || rounded < -_twoTo63 || rounded >= _twoTo63) {
    return null;
  }
  return rounded.toInt();
}

/// [result], or null (absent) when it is not a finite number.
num? _finite(num? result) =>
    result is double && !result.isFinite ? null : result;

LocalFunction _binaryNumber(num? Function(num a, num b) compute) =>
    LocalFunction(
      arguments: _twoNumbers,
      implementation: (DynamicMap arguments) =>
          switch ((arguments['a'], arguments['b'])) {
            (final num a, final num b) => _finite(compute(a, b)),
            _ => null,
          },
    );

LocalFunction _unaryNumber(num? Function(num value) compute) => LocalFunction(
  arguments: const <String, FunctionArgType>{'value': FunctionArgType.number},
  implementation: (DynamicMap arguments) => switch (arguments['value']) {
    final num value => _finite(compute(value)),
    _ => null,
  },
);

LocalFunction _comparison(bool Function(int comparison) test) => LocalFunction(
  arguments: _twoNumbers,
  implementation: (DynamicMap arguments) =>
      switch ((arguments['a'], arguments['b'])) {
        (final num a, final num b) => test(compareNumbers(a, b)),
        _ => null,
      },
);

// --- Equality, booleans, strings, lists ---------------------------------------

LocalFunction _equality({required bool wantEqual}) => LocalFunction(
  arguments: _twoAny,
  implementation: (DynamicMap arguments) =>
      valueEquals(arguments['a']!, arguments['b']!) == wantEqual,
);

LocalFunction _binaryBoolean(bool Function(bool a, bool b) combine) =>
    LocalFunction(
      arguments: const <String, FunctionArgType>{
        'a': FunctionArgType.boolean,
        'b': FunctionArgType.boolean,
      },
      implementation: (DynamicMap arguments) =>
          switch ((arguments['a'], arguments['b'])) {
            (final bool a, final bool b) => combine(a, b),
            _ => null,
          },
    );

LocalFunction _unaryString(Object Function(String value) compute) =>
    LocalFunction(
      arguments: const <String, FunctionArgType>{
        'value': FunctionArgType.string,
      },
      implementation: (DynamicMap arguments) => switch (arguments['value']) {
        final String value => compute(value),
        _ => null,
      },
    );

/// How `concat` shows an operand: a string as is, a number by
/// [numberToDisplayString], a boolean as `true` or `false`, anything else
/// (absent, a list, a map) as nothing.
String _display(Object? value) => switch (value) {
  final String s => s,
  final num n => numberToDisplayString(n),
  final bool b => b ? 'true' : 'false',
  _ => '',
};

bool _has(List<Object?> list, Object value) =>
    list.any((Object? e) => valueEquals(e ?? missing, value));

/// A (list, value) function: an absent list is the empty list.
LocalFunction _listFunction(
  Object Function(List<Object?> list, Object value) compute,
) => LocalFunction(
  arguments: const <String, FunctionArgType>{
    'list': FunctionArgType.list,
    'value': FunctionArgType.any,
  },
  implementation: (DynamicMap arguments) => compute(switch (arguments['list']) {
    final List<Object?> list => list,
    _ => const <Object?>[],
  }, arguments['value']!),
);
