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

/// One of the limits of [CraftLimits] (see the `craft_limits` blueprint).
enum CraftLimit {
  /// The size of a source, data file or blob, in bytes (UTF-8 for text).
  maxSourceBytes,

  /// The length of a string value, in UTF-8 bytes.
  maxStringBytes,

  /// The number of declarations of a library.
  maxDeclarations,

  /// The nesting depth of a declaration, a value, or an expansion.
  maxDepth,

  /// The number of nodes of a declaration, a data value, or an expansion.
  maxNodes,

  /// The number of evaluation steps of an expansion.
  maxSteps,
}

/// The limits under which an engine loads and expands templates (see the
/// `craft_limits` blueprint). Every limit is a positive integer; a host can
/// raise or lower each one.
class CraftLimits {
  /// Creates limits; each one defaults to the engine's default.
  ///
  /// Throws an [ArgumentError] when a limit is not positive.
  CraftLimits({
    this.maxSourceBytes = 1048576,
    this.maxStringBytes = 65536,
    this.maxDeclarations = 1000,
    this.maxDepth = 100,
    this.maxNodes = 100000,
    this.maxSteps = 100000,
  }) {
    for (final CraftLimit limit in CraftLimit.values) {
      if (this[limit] < 1) {
        throw ArgumentError.value(this[limit], limit.name, 'Must be positive');
      }
    }
    if (maxDepth > maxDepthCeiling) {
      throw ArgumentError.value(
        maxDepth,
        'maxDepth',
        'This engine supports at most $maxDepthCeiling',
      );
    }
  }

  /// The largest `maxDepth` this engine accepts: deeper nesting could
  /// exhaust the stack of a stage.
  static const int maxDepthCeiling = 1000;

  /// Limits from their JSON form ([toJson]); a limit that [json] leaves out
  /// has its default.
  ///
  /// Throws an [ArgumentError] when [json] has another key or a value that is
  /// not a positive integer.
  factory CraftLimits.fromJson(Map<String, Object?> json) {
    for (final MapEntry<String, Object?> entry in json.entries) {
      if (!CraftLimit.values.any((CraftLimit l) => l.name == entry.key) ||
          entry.value is! int) {
        throw ArgumentError.value(entry, 'json', 'Not a limit');
      }
    }
    final CraftLimits defaults = CraftLimits.defaults;
    int pick(CraftLimit limit) => json[limit.name] as int? ?? defaults[limit];
    return CraftLimits(
      maxSourceBytes: pick(CraftLimit.maxSourceBytes),
      maxStringBytes: pick(CraftLimit.maxStringBytes),
      maxDeclarations: pick(CraftLimit.maxDeclarations),
      maxDepth: pick(CraftLimit.maxDepth),
      maxNodes: pick(CraftLimit.maxNodes),
      maxSteps: pick(CraftLimit.maxSteps),
    );
  }

  /// The engine's default limits.
  static final CraftLimits defaults = CraftLimits();

  /// The largest source, data file or blob, in bytes.
  final int maxSourceBytes;

  /// The longest string value, in UTF-8 bytes.
  final int maxStringBytes;

  /// The most declarations in a library.
  final int maxDeclarations;

  /// The deepest nesting of a declaration, a value, or an expansion.
  final int maxDepth;

  /// The most nodes in a declaration, a data value, or an expansion.
  final int maxNodes;

  /// The most evaluation steps of an expansion.
  final int maxSteps;

  /// The value of [limit].
  int operator [](CraftLimit limit) => switch (limit) {
    CraftLimit.maxSourceBytes => maxSourceBytes,
    CraftLimit.maxStringBytes => maxStringBytes,
    CraftLimit.maxDeclarations => maxDeclarations,
    CraftLimit.maxDepth => maxDepth,
    CraftLimit.maxNodes => maxNodes,
    CraftLimit.maxSteps => maxSteps,
  };

  /// The JSON form that a host publishes: every limit by name.
  Map<String, int> toJson() => <String, int>{
    for (final CraftLimit limit in CraftLimit.values) limit.name: this[limit],
  };

  @override
  String toString() => 'CraftLimits(${toJson()})';
}

/// Something exceeds [limit].
class CraftLimitException implements Exception {
  /// Creates the failure of [limit].
  const CraftLimitException(this.limit, this.message);

  /// The limit exceeded.
  final CraftLimit limit;

  /// A description for authors.
  final String message;

  @override
  String toString() => 'CraftLimitException(${limit.name}): $message';
}

/// Stands, in host input, for a value that a host's conversion found beyond
/// the limits; [limitedValue] fails with [failure] where it finds it, so the
/// runtime treats it as host input beyond the limits.
final class BeyondLimits {
  /// Stands for a value that failed with [failure].
  const BeyondLimits(this.failure);

  /// Why the value is beyond the limits.
  final CraftLimitException failure;
}

/// The length of [text] in UTF-8, in bytes, as `utf8.encode` writes it (a
/// lone surrogate as the three bytes of U+FFFD).
int utf8Length(String text) {
  int length = 0;
  for (int i = 0; i < text.length; i += 1) {
    final int unit = text.codeUnitAt(i);
    if (unit < 0x80) {
      length += 1;
    } else if (unit < 0x800) {
      length += 2;
    } else if (unit >= 0xD800 &&
        unit < 0xDC00 &&
        i + 1 < text.length &&
        (text.codeUnitAt(i + 1) & 0xFC00) == 0xDC00) {
      length += 4;
      i += 1;
    } else {
      length += 3;
    }
  }
  return length;
}

/// Converts [value] into a value of the language, as [toValue] does, and
/// checks it against the depth and string limits of [limits]. Objects that
/// [keep] accepts are kept as they are, as nodes of depth 1.
///
/// Throws a [CraftLimitException] when the value is nested deeper than
/// `maxDepth`, holds a string longer than `maxStringBytes` or holds a
/// [BeyondLimits] (its failure), and a
/// [FormatException] when it holds something that is not a value.
Object limitedValue(
  Object? value,
  CraftLimits limits, {
  bool Function(Object value)? keep,
}) => _limitedValue(value, limits, keep, 1);

Object _limitedValue(
  Object? value,
  CraftLimits limits,
  bool Function(Object value)? keep,
  int depth,
) {
  if (depth > limits.maxDepth) {
    throw CraftLimitException(
      CraftLimit.maxDepth,
      'A value is nested deeper than ${limits.maxDepth}.',
    );
  }
  return switch (value) {
    BeyondLimits(:final CraftLimitException failure) => throw failure,
    final Object kept when keep != null && keep(kept) => kept,
    final String text when utf8Length(text) > limits.maxStringBytes =>
      throw CraftLimitException(
        CraftLimit.maxStringBytes,
        'A string is longer than ${limits.maxStringBytes} bytes.',
      ),
    List<Object?>() => <Object>[
      for (final Object? e in value) _limitedValue(e, limits, keep, depth + 1),
    ],
    Map<Object?, Object?>() when isStringKeyed(value) => <String, Object>{
      for (final MapEntry<Object?, Object?> e in value.entries)
        e.key as String: _limitedValue(e.value, limits, keep, depth + 1),
    },
    _ => toValue(value),
  };
}

/// Throws a [CraftLimitException] when [library] exceeds the limits that
/// [limits] sets on libraries: `maxDeclarations`, and for each declaration
/// `maxDepth`, `maxNodes` and `maxStringBytes` (see the `craft_limits`
/// blueprint).
void checkLibraryLimits(RemoteWidgetLibrary library, CraftLimits limits) {
  if (library.widgets.length > limits.maxDeclarations) {
    throw CraftLimitException(
      CraftLimit.maxDeclarations,
      'The library has ${library.widgets.length} declarations; the limit is '
      '${limits.maxDeclarations}.',
    );
  }
  for (final WidgetDeclaration declaration in library.widgets) {
    final _DeclarationCheck check = _DeclarationCheck(limits, declaration.name);
    if (declaration.initialState case final DynamicMap state) {
      check.visit(state, 1);
    }
    check.visit(declaration.root, 1);
  }
}

class _DeclarationCheck {
  _DeclarationCheck(this.limits, this.declaration);

  final CraftLimits limits;
  final String declaration;
  int nodes = 0;

  Never _fail(CraftLimit limit, String what) =>
      throw CraftLimitException(limit, 'The declaration $declaration $what.');

  void visit(Object? node, int depth) {
    if (depth > limits.maxDepth) {
      _fail(CraftLimit.maxDepth, 'is nested deeper than ${limits.maxDepth}');
    }
    nodes += 1;
    if (nodes > limits.maxNodes) {
      _fail(CraftLimit.maxNodes, 'has more than ${limits.maxNodes} nodes');
    }
    if (node is String && utf8Length(node) > limits.maxStringBytes) {
      _fail(
        CraftLimit.maxStringBytes,
        'has a string longer than ${limits.maxStringBytes} bytes',
      );
    }
    for (final Object? child in libraryNodeChildren(node)) {
      visit(child, depth + 1);
    }
  }
}

/// The children of a node of a library, which limits count as nested one
/// level deeper (see the `craft_limits` blueprint): the elements of a list, the
/// values of a map, a loop's input and output, a call's and an event's
/// argument values, a switch's input, keys and values, a setter's value and
/// a builder's widget.
Iterable<Object?> libraryNodeChildren(Object? node) => switch (node) {
  List<Object?>() => node,
  Map<String, Object?>() => node.values,
  Loop() => <Object?>[node.input, node.output],
  ConstructorCall() => node.arguments.values,
  EventHandler() => node.eventArguments.values,
  Switch() => <Object?>[
    node.input,
    for (final MapEntry<Object?, Object> c
        in node.outputs.entries) ...<Object?>[
      if (c.key != null) c.key,
      c.value,
    ],
  ],
  SetStateHandler() => <Object?>[node.value],
  WidgetBuilderDeclaration() => <Object?>[node.widget],
  _ => const <Object?>[],
};
