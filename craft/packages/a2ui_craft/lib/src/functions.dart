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

import 'name_resolution.dart';
import 'rfw/model.dart';
import 'rfw/text.dart' show isExcludedFromQualifiedNames;

/// Signature of a function's implementation (see [LocalFunction]).
///
/// [arguments] holds every parameter of the function: an argument the call
/// did not pass, or passed as absent, is [missing]. Returning null or
/// [missing] means the absent value.
typedef LocalFunctionImplementation = Object? Function(DynamicMap arguments);

/// The kind of value a [LocalFunction] parameter accepts.
///
/// When a call passes a present value of another kind, the call evaluates to
/// absent without running the function (see the `craft_functions` blueprint).
enum FunctionArgType {
  /// An integer, or a double that is not NaN.
  number,

  /// A string.
  string,

  /// A boolean.
  boolean,

  /// A list.
  list,

  /// Any value.
  any;

  /// Whether the present value [value] is of this kind.
  bool accepts(Object value) => switch (this) {
    FunctionArgType.number => isNumber(value),
    FunctionArgType.string => value is String,
    FunctionArgType.boolean => value is bool,
    FunctionArgType.list => value is List<Object?>,
    FunctionArgType.any => true,
  };
}

/// A pure, deterministic function that templates call in value positions:
/// its parameters and its implementation.
class LocalFunction {
  /// Creates a function with the given parameters and [implementation].
  const LocalFunction({required this.arguments, required this.implementation});

  /// The parameters, by name, with the kind of value each accepts.
  final Map<String, FunctionArgType> arguments;

  /// The computation. See [LocalFunctionImplementation].
  final LocalFunctionImplementation implementation;
}

/// The functions an engine offers templates: the standard functions,
/// registered under their bare names, and host functions, registered under
/// qualified keys (`fmt::price`).
class FunctionRegistry {
  /// Creates a registry of [standard] and [host] functions.
  ///
  /// Throws an [ArgumentError] if a host key is not `lib::name` with a
  /// library other than `core` and every part a valid qualified-name part.
  FunctionRegistry({
    required Map<String, LocalFunction> standard,
    Map<String, LocalFunction> host = const <String, LocalFunction>{},
  }) : _functions = <String, LocalFunction>{...standard} {
    for (final MapEntry<String, LocalFunction> entry in host.entries) {
      _checkHostKey(entry.key);
      _functions[entry.key] = entry.value;
    }
  }

  final Map<String, LocalFunction> _functions;

  /// Every registered key.
  Iterable<String> get keys => _functions.keys;

  /// Whether [key] is registered.
  bool contains(String key) => _functions.containsKey(key);

  /// The function registered under [key], or null.
  LocalFunction? operator [](String key) => _functions[key];

  static final RegExp _identifier = RegExp(r'^[A-Za-z_][A-Za-z0-9_]*$');

  /// Whether [part] can be written in a qualified name (see the
  /// `craft_libraries_and_names` blueprint, requirement 1).
  static bool _isNamePart(String part) =>
      _identifier.hasMatch(part) && !isExcludedFromQualifiedNames(part);

  static void _checkHostKey(String key) {
    final (LibraryName? library, String name) = splitQualifiedName(key);
    final bool valid =
        library != null &&
        library != coreLibrary &&
        library.parts.every(_isNamePart) &&
        _isNamePart(name);
    if (!valid) {
      throw ArgumentError.value(
        key,
        'key',
        'A host function key must be lib::name, with a library other than '
            'core and only identifiers that are not reserved words',
      );
    }
  }
}

/// Whether [value] is a number: an integer or a double that is not NaN.
bool isNumber(Object? value) =>
    value is int || (value is double && !value.isNaN);

/// Converts [value] into a value of the language, recursively: null becomes
/// [missing], lists and maps are copied. Throws a [FormatException] if
/// [value] contains anything else than booleans, numbers, strings, lists,
/// maps whose keys are all strings, null and [missing].
Object toValue(Object? value) => switch (value) {
  null || Missing() => missing,
  bool() || int() || double() || String() => value,
  List<Object?>() => <Object>[for (final Object? e in value) toValue(e)],
  Map<Object?, Object?>() when isStringKeyed(value) => <String, Object>{
    for (final MapEntry<Object?, Object?> e in value.entries)
      e.key as String: toValue(e.value),
  },
  _ => throw FormatException('Not a value: ${value.runtimeType}'),
};

/// Whether every key of [map] is a string, whatever its static key type.
bool isStringKeyed(Map<Object?, Object?> map) =>
    map is Map<String, Object?> || map.keys.every((Object? k) => k is String);

/// The equality of the standard functions: numbers by their mathematical
/// value (NaN equals nothing), strings by their UTF-16 code units, lists
/// element by element, maps by their keys and values in any order, and
/// absent only to absent.
bool valueEquals(Object a, Object b) {
  if (a is num && b is num) {
    return !a.isNaN && !b.isNaN && compareNumbers(a, b) == 0;
  }
  if (a is List<Object?> && b is List<Object?>) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i += 1) {
      if (!valueEquals(a[i] ?? missing, b[i] ?? missing)) return false;
    }
    return true;
  }
  if (a is Map<String, Object?> && b is Map<String, Object?>) {
    if (a.length != b.length) return false;
    for (final MapEntry<String, Object?> entry in a.entries) {
      if (!b.containsKey(entry.key) ||
          !valueEquals(entry.value ?? missing, b[entry.key] ?? missing)) {
        return false;
      }
    }
    return true;
  }
  return (a is bool || a is String || a is Missing) && a == b;
}

/// Compares two numbers that are not NaN by their exact mathematical values
/// (an integer is not rounded to a double first). Zero and negative zero
/// are equal.
int compareNumbers(num a, num b) {
  if (a is int && b is double) return -compareNumbers(b, a);
  if (a is double && b is int) {
    if (a.isInfinite) return a > 0 ? 1 : -1;
    final double floor = a.floorToDouble();
    final int whole = BigInt.from(floor).compareTo(BigInt.from(b));
    if (whole != 0) return whole;
    return a > floor ? 1 : 0;
  }
  return a < b ? -1 : (a > b ? 1 : 0);
}

/// Formats a number the same way on every engine: an integer in decimal, a
/// double as ECMAScript's `Number.prototype.toString` does (shortest
/// round-trip digits, exponent form outside 1e-6 to 1e21), with negative
/// zero as `0`.
String numberToDisplayString(num value) {
  if (value is int) return value.toString();
  if (value == 0) return '0';
  final String text = value.toString();
  return text.endsWith('.0') ? text.substring(0, text.length - 2) : text;
}
