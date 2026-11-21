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
import 'media_context.dart';
import 'name_resolution.dart';
import 'rfw/model.dart';

/// Reads the symbol reference [reference] written in [library]; the result
/// is a value of the language.
typedef SymbolReader =
    Object Function(LibraryName library, SymbolReference reference);

/// Why an evaluation failed (see the `functions` blueprint).
enum EvaluationErrorKind {
  /// A call names neither a widget nor a function callable from its library.
  unknownFunction,

  /// A call passes an argument that the function (or `absent`) does not have.
  invalidArgument,

  /// A host function threw, or returned something that is not a value.
  functionFailed,

  /// The value contains a node that this evaluator does not evaluate: a
  /// widget call, a loop, a switch, a handler, a theme, loop or builder
  /// argument reference, or a symbol reference without a [SymbolReader].
  notEvaluated,
}

/// An evaluation failed. Templates are untrusted, so every failure of a
/// template's value is reported this way rather than by any other exception.
class EvaluationException implements Exception {
  /// Creates an evaluation failure of [kind].
  const EvaluationException(this.kind, this.message);

  /// The kind of failure.
  final EvaluationErrorKind kind;

  /// A description for authors.
  final String message;

  @override
  String toString() => 'EvaluationException(${kind.name}): $message';
}

/// What a call denotes (see the `functions` blueprint, requirements 2 and 3).
sealed class CallKind {
  const CallKind();
}

/// A call named `absent`: the absent value.
final class AbsentCall extends CallKind {
  const AbsentCall();
}

/// A call named `call`: a handler application.
final class HandlerApplication extends CallKind {
  const HandlerApplication();
}

/// A call of the widget [widget].
final class WidgetCall extends CallKind {
  const WidgetCall(this.widget);

  /// What the call's name resolves to.
  final ResolvedName widget;
}

/// A call of the function registered under [key].
final class FunctionCall extends CallKind {
  const FunctionCall(this.key);

  /// The registered key.
  final String key;
}

/// A call that names neither a widget nor a callable function.
final class UnknownCall extends CallKind {
  const UnknownCall();
}

/// Evaluates the values of a library that consist of literals, lists, maps,
/// `absent`, references to args, data, state and the media context, and
/// function calls, given the values of args, data and state and the media
/// context.
///
/// The result is a value of the language: booleans, numbers, strings, lists,
/// maps, and [missing] for the absent value.
class Evaluator {
  /// Creates an evaluator that tells widget calls from function calls with
  /// [resolver], calls the functions in [functions] and reads symbol
  /// references with [symbols].
  Evaluator(this.resolver, this.functions, {this.symbols});

  /// Resolves call names (see the `libraries_and_names` blueprint).
  final NameResolver resolver;

  /// The functions templates can call.
  final FunctionRegistry functions;

  /// Reads a symbol reference written in a library (see the
  /// `template_registry` blueprint). Without it, symbol references are not
  /// evaluated.
  final SymbolReader? symbols;

  /// Classifies a call named [name], written in [library] inside
  /// [declaration].
  CallKind classify(
    String name, {
    required LibraryName library,
    String? declaration,
  }) {
    if (name == 'absent') return const AbsentCall();
    if (name == 'call') return const HandlerApplication();
    if (resolver.resolve(library, name, excluding: declaration)
        case final ResolvedName widget) {
      return WidgetCall(widget);
    }
    final String? key = resolver.functionKey(library, name, functions.contains);
    return key == null ? const UnknownCall() : FunctionCall(key);
  }

  /// Evaluates [value], written in [library] inside [declaration], with the
  /// given values for args, data and state (absent when not given) and the
  /// given [media] context (see [readMedia]).
  ///
  /// Throws an [EvaluationException] when the evaluation fails, and a
  /// [FormatException] when a reference reads a part of [args], [data] or
  /// [state] that is not a value (see [toValue]): that is a host error.
  Object evaluate(
    Object? value, {
    required LibraryName library,
    String? declaration,
    Object? args,
    Object? data,
    Object? state,
    MediaContext? media,
  }) {
    return _Evaluation(
      this,
      library,
      declaration,
      args,
      data,
      state,
      media,
    ).eval(value);
  }
}

class _Evaluation {
  _Evaluation(
    this.evaluator,
    this.library,
    this.declaration,
    this.args,
    this.data,
    this.state,
    this.media,
  );

  final Evaluator evaluator;
  final LibraryName library;
  final String? declaration;
  final Object? args;
  final Object? data;
  final Object? state;
  final MediaContext? media;

  Object eval(Object? node) => switch (node) {
    null || Missing() => missing,
    bool() || int() || double() || String() => node,
    List<Object?>() => <Object>[for (final Object? e in node) eval(e)],
    Map<String, Object?>() => <String, Object>{
      for (final MapEntry<String, Object?> e in node.entries)
        e.key: eval(e.value),
    },
    ArgsReference() => _read(args, node.parts),
    DataReference() => _read(data, node.parts),
    StateReference() => _read(state, node.parts),
    MediaReference() => readMedia(media, node.parts),
    ConstructorCall() => _call(node),
    SymbolReference() when evaluator.symbols != null => evaluator.symbols!(
      library,
      node,
    ),
    _ => throw EvaluationException(
      EvaluationErrorKind.notEvaluated,
      'A ${node.runtimeType} is evaluated by the runtime.',
    ),
  };

  /// The value at [parts] under [root]: absent when a part is missing, out of
  /// range, or of the wrong kind for the value it indexes.
  Object _read(Object? root, List<Object> parts) {
    Object? current = root;
    for (final Object part in parts) {
      _checkPlain(current);
      current = switch ((current, part)) {
        (final Map<Object?, Object?> map, final String key) => map[key],
        (final List<Object?> list, final int index)
            when index >= 0 && index < list.length =>
          list[index],
        _ => null,
      };
    }
    return toValue(current);
  }

  static void _checkPlain(Object? value) {
    if (value
        case null ||
            Missing() ||
            bool() ||
            num() ||
            String() ||
            List<Object?>()) {
      return;
    }
    if (value is Map<Object?, Object?> && isStringKeyed(value)) return;
    throw FormatException('Not a value: ${value.runtimeType}');
  }

  Object _call(ConstructorCall call) {
    final String name = call.name;
    final String key;
    switch (evaluator.classify(
      name,
      library: library,
      declaration: declaration,
    )) {
      case AbsentCall():
        checkCallArguments(call, const <String>{});
        return missing;
      case HandlerApplication() || WidgetCall():
        throw EvaluationException(
          EvaluationErrorKind.notEvaluated,
          '$name is a widget or a handler application, evaluated by the '
          'runtime.',
        );
      case UnknownCall():
        throw EvaluationException(
          EvaluationErrorKind.unknownFunction,
          '$name is neither a widget nor a function callable from $library.',
        );
      case FunctionCall(key: final String functionKey):
        key = functionKey;
    }
    final LocalFunction function = evaluator.functions[key]!;
    checkCallArguments(call, function.arguments.keys.toSet());
    return invokeFunction(key, function, <String, Object>{
      for (final MapEntry<String, Object?> e in call.arguments.entries)
        e.key: eval(e.value),
    });
  }
}

/// Throws an [EvaluationException] of kind
/// [EvaluationErrorKind.invalidArgument] when [call] passes an argument that
/// is not among [parameters].
void checkCallArguments(ConstructorCall call, Set<String> parameters) {
  for (final String argument in call.arguments.keys) {
    if (!parameters.contains(argument)) {
      throw EvaluationException(
        EvaluationErrorKind.invalidArgument,
        '${call.name} has no argument named $argument. '
        '${parameters.isEmpty ? 'It takes none.' : 'It takes ${parameters.join(', ')}.'}',
      );
    }
  }
}

/// Calls [function], registered as [key], with the evaluated arguments
/// [values] (see the `functions` blueprint, requirements 4 and 5): absent
/// when an argument is present and not of its parameter's kind, otherwise
/// the function's result as a value.
///
/// Throws an [EvaluationException] of kind
/// [EvaluationErrorKind.functionFailed] when the function throws or returns
/// something that is not a value.
Object invokeFunction(
  String key,
  LocalFunction function,
  Map<String, Object> values,
) {
  final DynamicMap arguments = <String, Object?>{};
  for (final MapEntry<String, FunctionArgType> parameter
      in function.arguments.entries) {
    final Object value = values[parameter.key] ?? missing;
    if (value is! Missing && !parameter.value.accepts(value)) return missing;
    arguments[parameter.key] = value;
  }
  try {
    return toValue(function.implementation(arguments));
  } catch (error) {
    throw EvaluationException(
      EvaluationErrorKind.functionFailed,
      'Function $key failed: $error',
    );
  }
}
