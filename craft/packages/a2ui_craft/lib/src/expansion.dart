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

import 'canonical_json.dart';
import 'rfw/model.dart';

/// A position in an expansion: from the root node, the argument names, map
/// keys and list indexes that lead to it (see the `runtime` blueprint).
typedef ExpansionPath = List<Object>;

/// Why a node of an expansion is an [ErrorNode] (see the `runtime`
/// blueprint, requirement 12).
enum ExpansionErrorKind {
  /// A call names neither a widget nor a function (`functions`).
  unknownFunction,

  /// A call passes an argument that its function does not have (`functions`).
  invalidArgument,

  /// A host function failed (`functions`).
  functionFailed,

  /// A node that no feature implemented by this engine evaluates, such as a
  /// theme reference.
  notEvaluated,

  /// The root, a template's root or a builder's output is not a widget.
  notAWidget,

  /// A template is called inside its own expansion.
  recursiveWidget,

  /// A widget, builder or handler where only a value is allowed, or a node
  /// where the text format never puts one.
  invalidValue,

  /// A `set state` with no stateful template around it.
  noState,

  /// Evaluation or expansion went deeper than `maxDepth`, a value is nested
  /// deeper, or the host's input is (see the `limits` blueprint).
  depthExceeded,

  /// A value holds a string longer than `maxStringBytes`.
  stringTooLong,

  /// The expansion took more than `maxSteps` evaluation steps.
  stepsExceeded,

  /// The expansion has more than `maxNodes` nodes.
  nodesExceeded,
}

/// A primitive in an expansion: its fully qualified [name] and its arguments,
/// evaluated and expanded.
final class WidgetNode {
  /// Creates a node for the primitive [name] at [path].
  WidgetNode(this.name, this.arguments, this.path);

  /// The primitive's library and name.
  final FullyQualifiedWidgetName name;

  /// The expanded arguments, in the order the call gives them.
  final Map<String, Object> arguments;

  /// Where the node is.
  final ExpansionPath path;
}

/// The placeholder for a widget whose expansion failed.
final class ErrorNode {
  /// Creates a placeholder at [path].
  ErrorNode(this.kind, this.message, this.path);

  /// The kind of failure.
  final ExpansionErrorKind kind;

  /// A description for authors.
  final String message;

  /// Where the node is.
  final ExpansionPath path;
}

/// A [HostWidget] placed in an expansion; the adapter renders the host's
/// widget [id] there.
final class HostWidgetNode {
  /// Creates the node of the host widget [id] at [path].
  HostWidgetNode(this.id, this.path);

  /// The host's identifier.
  final String id;

  /// Where the node is.
  final ExpansionPath path;
}

/// A widget builder in an expansion; the host expands its output with
/// `CraftRuntime.expandBuilder`.
final class BuilderNode {
  /// Creates a builder node; [closure] is opaque to everything but the
  /// runtime that created it.
  BuilderNode(this.path, this.closure);

  /// Where the node is.
  final ExpansionPath path;

  /// The builder and the scope it was written in.
  final Object closure;
}

/// The instance of a stateful template at one position of an expansion.
final class StateInstance {
  /// Creates an instance of [declaration], called as [widget], at [path],
  /// for the [generation] of the declaring library's registration.
  StateInstance(
    this.path,
    this.widget,
    this.declaration,
    this.generation,
    this.value,
  );

  /// Where the template's expansion is.
  final ExpansionPath path;

  /// The template's library and name.
  final FullyQualifiedWidgetName widget;

  /// The declaration the instance was created from.
  final WidgetDeclaration declaration;

  /// The registry's generation of the declaring library (see
  /// `TemplateRegistry.generation`) when the instance was created.
  final int generation;

  /// The current state. The runtime replaces it, never changes it in place,
  /// so an expansion that read it keeps what it read.
  Map<String, Object> value;
}

/// A handler of an expansion: what firing it does (see the `runtime`
/// blueprint, requirement 8).
sealed class HandlerValue {
  const HandlerValue();
}

/// `event N {...}`: emits the event [name] to the host.
final class EventValue extends HandlerValue {
  /// Creates an event handler.
  const EventValue(this.name, this.arguments);

  /// The event's name.
  final String name;

  /// The event's own arguments.
  final Map<String, Object> arguments;
}

/// `set state.p = v`: sets the state of [owner] at [parts] to [value].
final class SetStateValue extends HandlerValue {
  /// Creates a state setter.
  const SetStateValue(this.owner, this.parts, this.value);

  /// The stateful instance whose state is set.
  final StateInstance owner;

  /// The path into the state.
  final List<Object> parts;

  /// The value, computed when the handler was expanded.
  final Object value;
}

/// `call H {...}`: applies [handler] with [arguments].
final class HandlerCallValue extends HandlerValue {
  /// Creates a handler application.
  const HandlerCallValue(this.handler, this.arguments);

  /// The handler applied.
  final Object handler;

  /// The arguments, which win over the event's.
  final Map<String, Object> arguments;
}

/// A handler that the host passes in a template's arguments, identified by
/// [id]; firing it gives the host back its [id].
final class HostHandler extends HandlerValue {
  /// Creates a host handler.
  const HostHandler(this.id);

  /// The host's identifier.
  final String id;

  @override
  bool operator ==(Object other) => other is HostHandler && other.id == id;

  @override
  int get hashCode => id.hashCode;
}

/// A widget that the host passes in a template's arguments, identified by
/// [id]; wherever the template places it, the expansion has a
/// [HostWidgetNode] for the adapter to render.
final class HostWidget {
  /// Creates a host widget.
  const HostWidget(this.id);

  /// The host's identifier.
  final String id;

  @override
  bool operator ==(Object other) => other is HostWidget && other.id == id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'HostWidget($id)';
}

/// A stateful instance as an expansion saw it.
final class ExpandedState {
  /// Records [instance] with its current state.
  ExpandedState(this.instance) : value = instance.value;

  /// The instance.
  final StateInstance instance;

  /// Its state when it was expanded.
  final Map<String, Object> value;
}

/// One error of an expansion.
final class ExpansionError {
  /// Creates the report of [node].
  const ExpansionError(this.node);

  /// The placeholder that replaced the failed widget.
  final ErrorNode node;

  /// The kind of failure.
  ExpansionErrorKind get kind => node.kind;

  /// Where the placeholder is.
  ExpansionPath get path => node.path;

  @override
  String toString() =>
      'ExpansionError(${kind.name} at ${path.join('.')}): ${node.message}';
}

/// The result of expanding a template, or a builder's output.
final class Expansion {
  /// Creates an expansion.
  const Expansion(this.root, this.states, this.errors);

  /// The root node: a [WidgetNode], a [HostWidgetNode] or an [ErrorNode].
  final Object root;

  /// The stateful instances expanded, in document order.
  final List<ExpandedState> states;

  /// The errors, one per [ErrorNode], in document order.
  final List<ExpansionError> errors;

  /// The canonical JSON form (see the `runtime` blueprint, requirement 2).
  Map<String, Object?> toJson() => <String, Object?>{
    'root': canonicalExpansionValue(root),
    'states': <Object?>[
      for (final ExpandedState s in states)
        <String, Object?>{
          'at': s.instance.path,
          'widget': widgetNameString(s.instance.widget),
          'value': canonicalValue(s.value),
        },
    ],
    'errors': <Object?>[
      for (final ExpansionError e in errors)
        <String, Object?>{'at': e.path, 'kind': e.kind.name},
    ],
  };
}

/// `lib::name`, the way names are written in Craft.
String widgetNameString(FullyQualifiedWidgetName name) =>
    '${name.library}::${name.widget}';

/// The canonical JSON form of a node or value of an expansion: values as in
/// `text_format`, and a map with a `"$"` key for every other node.
Object? canonicalExpansionValue(Object value) => switch (value) {
  WidgetNode() => <String, Object?>{
    r'$': 'widget',
    'name': widgetNameString(value.name),
    'args': canonicalExpansionValue(value.arguments),
  },
  HostWidgetNode() => <String, Object?>{r'$': 'hostWidget', 'id': value.id},
  HostWidget() => <String, Object?>{r'$': 'hostWidget', 'id': value.id},
  ErrorNode() => <String, Object?>{r'$': 'error', 'kind': value.kind.name},
  BuilderNode() => <String, Object?>{r'$': 'builder'},
  EventValue() => <String, Object?>{
    r'$': 'event',
    'name': value.name,
    'args': canonicalValue(value.arguments),
  },
  SetStateValue() => <String, Object?>{
    r'$': 'setState',
    'state': <String, Object?>{
      'at': value.owner.path,
      'widget': widgetNameString(value.owner.widget),
    },
    'parts': value.parts,
    'value': canonicalValue(value.value),
  },
  HandlerCallValue() => <String, Object?>{
    r'$': 'call',
    'handler': canonicalExpansionValue(value.handler),
    'args': canonicalValue(value.arguments),
  },
  HostHandler() => <String, Object?>{r'$': 'hostHandler', 'id': value.id},
  List<Object>() => <Object?>[
    for (final Object e in value) canonicalExpansionValue(e),
  ],
  Map<String, Object>() => <String, Object?>{
    for (final MapEntry<String, Object> e in value.entries)
      e.key: canonicalExpansionValue(e.value),
  },
  _ => canonicalValue(value),
};
