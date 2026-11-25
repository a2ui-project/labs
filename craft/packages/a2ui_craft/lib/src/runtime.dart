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

import 'dart:convert';

import 'evaluator.dart';
import 'expansion.dart';
import 'functions.dart';
import 'limits.dart';
import 'media_context.dart';
import 'name_resolution.dart';
import 'rfw/model.dart';
import 'template_registry.dart';

/// Something firing a handler gives the host (see the `craft_runtime`
/// blueprint, requirement 9).
sealed class HostEvent {
  const HostEvent(this.arguments);

  /// The merged arguments.
  final Map<String, Object> arguments;
}

/// An `event` handler fired.
final class TemplateEvent extends HostEvent {
  /// Creates the event [name].
  const TemplateEvent(this.name, super.arguments);

  /// The event's name.
  final String name;

  @override
  String toString() => 'TemplateEvent($name, $arguments)';
}

/// A [HostHandler] fired.
final class HostHandlerEvent extends HostEvent {
  /// Creates the firing of [handler].
  const HostHandlerEvent(this.handler, super.arguments);

  /// The host's handler.
  final HostHandler handler;

  @override
  String toString() => 'HostHandlerEvent(${handler.id}, $arguments)';
}

/// Why a `set state` did nothing when fired.
enum FireErrorKind {
  /// The instance is no longer in the expansion, or the parts do not name
  /// existing state.
  unknownState,

  /// The value to set is absent.
  absentValue,

  /// The event arguments, or the state that a setter would give, are nested
  /// deeper than `maxDepth` (see the `craft_limits` blueprint).
  depthExceeded,

  /// The event arguments hold a string longer than `maxStringBytes`.
  stringTooLong,
}

/// A `set state` that did nothing when fired.
final class FireError {
  /// Creates a firing error of [kind].
  const FireError(this.kind, this.message);

  /// The kind of failure.
  final FireErrorKind kind;

  /// A description for authors.
  final String message;

  @override
  String toString() => 'FireError(${kind.name}): $message';
}

/// What firing a handler did.
final class FireResult {
  /// Creates a result.
  const FireResult(this.events, this.errors, {required this.stateChanged});

  /// The events for the host, in order.
  final List<HostEvent> events;

  /// The setters that did nothing, in order.
  final List<FireError> errors;

  /// Whether some state was set.
  final bool stateChanged;
}

/// Whether firing [value] can do anything: an event, a setter or a host
/// handler, a handler application of such a handler, or a list holding one.
bool isRunnableHandler(Object? value) => switch (value) {
  EventValue() || SetStateValue() || HostHandler() => true,
  HandlerCallValue() => isRunnableHandler(value.handler),
  List<Object>() => value.any(isRunnableHandler),
  _ => false,
};

/// Expands one template of a [TemplateRegistry] with its arguments, data and
/// local state into a tree of primitives, and fires its handlers (see the
/// `craft_runtime` blueprint). It knows no UI framework: adapters render the
/// [Expansion] and fire the handlers they find in it.
class CraftRuntime {
  /// Creates a runtime for the widget [widget] as written in [library].
  ///
  /// Throws an [ArgumentError] when [args] or [data] is not valid host input
  /// (see [args] and [data]); so do their setters. Input beyond the limits of
  /// the registry is no host error: it makes every expansion an error node
  /// (see the `craft_limits` blueprint).
  CraftRuntime(
    this.registry, {
    required this.library,
    required this.widget,
    Map<String, Object?> args = const <String, Object?>{},
    Object? data,
    MediaContext? media,
  }) : _media = media {
    _setArgs(args);
    _setData(data);
  }

  /// The libraries and functions templates use.
  final TemplateRegistry registry;

  /// The library the root widget name is resolved from.
  final LibraryName library;

  /// The root widget's name, as a call in [library] would write it.
  final String widget;

  late Map<String, Object> _args;
  late Object _data;
  CraftLimitException? _argsLimit;
  CraftLimitException? _dataLimit;
  MediaContext? _media;
  final Map<String, StateInstance> _instances = <String, StateInstance>{};
  final List<void Function()> _listeners = <void Function()>[];

  /// The limits of expansions and of host input: those of [registry].
  CraftLimits get limits => registry.limits;

  /// The root's arguments: values, possibly holding [HostHandler]s and
  /// [HostWidget]s; empty when they exceed [limits].
  Map<String, Object> get args => _args;
  set args(Map<String, Object?> value) {
    _setArgs(value);
    _notify();
  }

  void _setArgs(Map<String, Object?> value) {
    try {
      _args = _hostValue(value, limits, host: true) as Map<String, Object>;
      _argsLimit = null;
    } on CraftLimitException catch (failure) {
      _args = const <String, Object>{};
      _argsLimit = failure;
    }
  }

  /// The data that `data.` references read: a value; absent when it exceeds
  /// [limits].
  Object get data => _data;
  set data(Object? value) {
    _setData(value);
    _notify();
  }

  void _setData(Object? value) {
    try {
      _data = _hostValue(value, limits, host: false);
      _dataLimit = null;
    } on CraftLimitException catch (failure) {
      _data = missing;
      _dataLimit = failure;
    }
  }

  /// The media context that `media.` references read (see the
  /// `craft_media_context` blueprint), or null when the host gives none.
  /// Setting a different one notifies listeners; setting an equal one does not.
  MediaContext? get media => _media;
  set media(MediaContext? value) => setMedia(value);

  /// Sets [media] to [value], notifying listeners when it changes unless
  /// [notify] is false; a host that passes false calls [refresh] later.
  /// Returns whether it changed.
  bool setMedia(MediaContext? value, {bool notify = true}) {
    if (value == _media) return false;
    _media = value;
    if (notify) _notify();
    return true;
  }

  /// Calls [listener] whenever an expansion may have changed: after a change
  /// of [args], [data] or [media], a [fire] that set state, and [refresh].
  void addListener(void Function() listener) => _listeners.add(listener);

  /// Stops calling [listener].
  void removeListener(void Function() listener) => _listeners.remove(listener);

  /// Tells listeners that the registry changed, or that an expansion may
  /// have changed for another reason (see [setMedia]).
  void refresh() => _notify();

  void _notify() {
    for (final void Function() listener in List<void Function()>.of(
      _listeners,
    )) {
      listener();
    }
  }

  /// Expands the root. Keeps the state of the stateful instances in the
  /// result, and of those inside the output of its builders, and drops all
  /// other state.
  ///
  /// An expansion that exceeds [limits] as a whole (host input beyond them,
  /// too many steps or nodes) is one error node and keeps all state.
  Expansion expand() {
    final _Pass pass = _Pass(this);
    final Object root;
    try {
      if (_argsLimit ?? _dataLimit case final CraftLimitException input) {
        throw _Stop.of(input);
      }
      final ResolvedName? resolved = switch (registry.classify(
        widget,
        library: library,
      )) {
        WidgetCall(widget: final ResolvedName name) => name,
        _ => null,
      };
      pass.depth = 1;
      root = resolved == null
          ? pass.fail(
              const <Object>[],
              ExpansionErrorKind.notAWidget,
              '$widget is not a widget visible from $library.',
            )
          : pass.expandWidget(
              pass.thunk(resolved, <String, Object>{..._args}),
              const <Object>[],
            );
    } on _Stop catch (stop) {
      return pass.stopped(stop, const <Object>[]);
    }
    _instances.removeWhere(
      (String key, StateInstance instance) =>
          !pass.seen.contains(key) &&
          !pass.builders.any(
            (ExpansionPath builder) =>
                instance.path.length > builder.length &&
                _startsWith(instance.path, builder),
          ),
    );
    return Expansion(root, pass.states, pass.errors);
  }

  /// Expands the output of [builder] for the argument [argument], at the
  /// position `builder.path` followed by [key] (a string or an integer that
  /// the host chooses, such as an item's index).
  ///
  /// Throws an [ArgumentError] when [key] is neither, or [argument] is not a
  /// value.
  Expansion expandBuilder(BuilderNode builder, Object key, Object? argument) {
    if (key is! String && key is! int) {
      throw ArgumentError.value(key, 'key', 'Must be a string or an integer');
    }
    final _Pass pass = _Pass(this);
    final _PlacedBuilder placed = builder.closure as _PlacedBuilder;
    final _Builder closure = placed.builder;
    final ExpansionPath path = <Object>[...builder.path, key];
    final Object root;
    try {
      final Object value;
      try {
        value = _hostValue(argument, limits, host: false);
      } on CraftLimitException catch (failure) {
        throw _Stop.of(failure);
      }
      pass.depth = placed.depth;
      root = pass.guard(path, () {
        final Object output = pass.eval(
          closure.node.widget,
          closure.env.withBuilderArgument(closure.node.argumentName, value),
        );
        return pass.deeper(
          () => switch (output) {
            _Thunk() => pass.expandWidget(output, path),
            HostWidget() => pass.place(output, path),
            _ => throw _Pass._failure(
              ExpansionErrorKind.notAWidget,
              'The builder did not give a widget.',
              closure.env,
              closure.node.widget,
            ),
          },
        );
      });
    } on _Stop catch (stop) {
      return pass.stopped(stop, path);
    }
    return Expansion(root, pass.states, pass.errors);
  }

  /// Fires [handler], a value found in an expansion, with the arguments that
  /// the primitive firing it supplies (see the `craft_runtime` blueprint,
  /// requirement 9). Tells listeners when it set state.
  ///
  /// Throws an [ArgumentError] when [eventArguments] is not a map of values.
  FireResult fire(
    Object handler, [
    Map<String, Object?> eventArguments = const <String, Object?>{},
  ]) {
    final List<HostEvent> events = <HostEvent>[];
    final List<FireError> errors = <FireError>[];
    bool changed = false;
    void run(Object entry, Map<String, Object> arguments) {
      switch (entry) {
        case EventValue():
          events.add(
            TemplateEvent(entry.name, <String, Object>{
              ...entry.arguments,
              ...arguments,
            }),
          );
        case SetStateValue():
          final FireError? error = _setState(entry);
          if (error == null) {
            changed = true;
          } else {
            errors.add(error);
          }
        case HandlerCallValue():
          run(entry.handler, <String, Object>{
            ...arguments,
            ...entry.arguments,
          });
        case HostHandler():
          events.add(HostHandlerEvent(entry, arguments));
        case List<Object>():
          for (final Object e in entry) {
            run(e, arguments);
          }
        default:
      }
    }

    final Map<String, Object> arguments;
    try {
      arguments =
          _hostValue(eventArguments, limits, host: false)
              as Map<String, Object>;
    } on CraftLimitException catch (failure) {
      return FireResult(const <HostEvent>[], <FireError>[
        FireError(switch (failure.limit) {
          CraftLimit.maxStringBytes => FireErrorKind.stringTooLong,
          _ => FireErrorKind.depthExceeded,
        }, failure.message),
      ], stateChanged: false);
    }
    run(handler, arguments);
    if (changed) _notify();
    return FireResult(events, errors, stateChanged: changed);
  }

  FireError? _setState(SetStateValue setter) {
    final StateInstance owner = setter.owner;
    final List<Object> parts = setter.parts;
    if (!identical(_instances[_instanceKey(owner.path, owner.widget)], owner)) {
      return const FireError(
        FireErrorKind.unknownState,
        'The template instance is no longer expanded.',
      );
    }
    if (setter.value is Missing) {
      return FireError(
        FireErrorKind.absentValue,
        'state.${parts.join('.')} was not set to an absent value.',
      );
    }
    final Map<String, Object> state =
        toValue(owner.value) as Map<String, Object>;
    final Object value = toValue(setter.value);
    Object current = state;
    for (int i = 0; i < parts.length; i += 1) {
      final bool last = i == parts.length - 1;
      switch ((current, parts[i])) {
        case (final Map<String, Object> map, final String key)
            when map.containsKey(key):
          if (last) map[key] = value;
          current = map[key]!;
        case (final List<Object> list, final int index)
            when index >= 0 && index < list.length:
          if (last) list[index] = value;
          current = list[index];
        default:
          return FireError(
            FireErrorKind.unknownState,
            'state.${parts.join('.')} does not name existing state.',
          );
      }
    }
    if (parts.isNotEmpty) {
      try {
        limitedValue(state, limits);
      } on CraftLimitException catch (failure) {
        return FireError(FireErrorKind.depthExceeded, failure.message);
      }
      owner.value = state;
      return null;
    }
    return FireError(
      FireErrorKind.unknownState,
      'state.${parts.join('.')} does not name existing state.',
    );
  }

  StateInstance _instance(
    ExpansionPath path,
    ResolvedName resolved,
    WidgetDeclaration declaration,
  ) {
    final String key = _instanceKey(path, resolved.fullName);
    final int generation = registry.generation(resolved.library);
    final StateInstance? existing = _instances[key];
    if (existing != null &&
        existing.generation == generation &&
        identical(existing.declaration, declaration)) {
      return existing;
    }
    return _instances[key] = StateInstance(
      List<Object>.unmodifiable(path),
      resolved.fullName,
      declaration,
      generation,
      toValue(declaration.initialState) as Map<String, Object>,
    );
  }

  static String _instanceKey(
    ExpansionPath path,
    FullyQualifiedWidgetName widget,
  ) => '${jsonEncode(path)} ${widgetNameString(widget)}';

  static bool _startsWith(ExpansionPath path, ExpansionPath prefix) {
    for (int i = 0; i < prefix.length; i += 1) {
      if (path[i] != prefix[i]) return false;
    }
    return true;
  }

  /// Converts host input into a value, as `limitedValue` does, also keeping
  /// [HostHandler]s and [HostWidget]s when [host] is true.
  ///
  /// Throws an [ArgumentError] when [value] is not a value, and a
  /// [CraftLimitException] when it exceeds [limits].
  static Object _hostValue(
    Object? value,
    CraftLimits limits, {
    required bool host,
  }) {
    try {
      return limitedValue(
        value,
        limits,
        keep: host ? (Object v) => v is HostHandler || v is HostWidget : null,
      );
    } on FormatException catch (error) {
      throw ArgumentError.value(value, 'value', error.message);
    }
  }
}

/// An expansion stopped as a whole by a limit.
class _Stop implements Exception {
  _Stop(this.kind, this.message);

  _Stop.of(CraftLimitException failure)
    : kind = switch (failure.limit) {
        CraftLimit.maxStringBytes => ExpansionErrorKind.stringTooLong,
        _ => ExpansionErrorKind.depthExceeded,
      },
      message = 'The host input: ${failure.message}';

  final ExpansionErrorKind kind;
  final String message;
}

/// A builder placed at a position of depth [depth].
class _PlacedBuilder {
  _PlacedBuilder(this.builder, this.depth);

  final _Builder builder;
  final int depth;
}

/// An expansion failure, turned into an [ErrorNode] at the innermost widget.
class _Failure implements Exception {
  _Failure(this.kind, this.message);

  _Failure.of(EvaluationException failure)
    : kind = ExpansionErrorKind.values.byName(failure.kind.name),
      message = failure.message;

  final ExpansionErrorKind kind;
  final String message;

  /// The scope of the failing node (see the `craft_runtime` blueprint,
  /// requirement 12); null until [locate] is first called.
  _Env? _scope;
  SourceRange? source;

  FullyQualifiedWidgetName? get template => switch (_scope) {
    _Env(:final LibraryName library, :final String declaration) =>
      FullyQualifiedWidgetName(library, declaration),
    _ => null,
  };

  /// Records that [node], evaluated in [env], failed or holds what failed:
  /// the first call names the failing node's scope, and the innermost node of
  /// that scope with a source range gives the position.
  void locate(_Env env, Object? node) {
    final _Env scope = _scope ??= env;
    if (source == null &&
        node is BlobNode &&
        scope.library == env.library &&
        scope.declaration == env.declaration) {
      source = node.source;
    }
  }
}

/// A template argument, evaluated when first read in the scope of the call.
class _Argument {
  _Argument.value(Object value) : _value = value, _node = null, _env = null;
  _Argument.lazy(Object? node, _Env env) : _node = node, _env = env;

  final Object? _node;
  final _Env? _env;
  Object? _value;
  Object? _failure;

  Object read(_Pass pass) {
    if (_failure case final Object failure) throw failure;
    if (_value case final Object value) return value;
    try {
      return _value = pass.eval(_node, _env!);
    } on _Stop {
      rethrow;
    } on Object catch (failure) {
      _failure = failure;
      rethrow;
    }
  }
}

/// The scope a node is evaluated in.
class _Env {
  const _Env({
    required this.library,
    this.declaration,
    this.arguments = const <String, _Argument>{},
    this.instance,
    this.chain = const <WidgetDeclaration>[],
    this.loops = const <Object>[],
    this.builderArguments = const <String, Object>{},
  });

  final LibraryName library;
  final String? declaration;
  final Map<String, _Argument> arguments;

  /// The nearest stateful instance, which `state` references read.
  final StateInstance? instance;

  /// The declarations whose bodies are being expanded, outermost first.
  final List<WidgetDeclaration> chain;

  /// The loop variables in scope, innermost last.
  final List<Object> loops;
  final Map<String, Object> builderArguments;

  _Env _copy({List<Object>? loops, Map<String, Object>? builderArguments}) =>
      _Env(
        library: library,
        declaration: declaration,
        arguments: arguments,
        instance: instance,
        chain: chain,
        loops: loops ?? this.loops,
        builderArguments: builderArguments ?? this.builderArguments,
      );

  _Env withLoop(Object item) => _copy(loops: <Object>[...loops, item]);

  _Env withBuilderArgument(String name, Object value) => _copy(
    builderArguments: <String, Object>{...builderArguments, name: value},
  );
}

/// A widget call, evaluated but not yet placed in the tree.
sealed class _Thunk {
  _Thunk(this.site, this.call);

  /// The scope of the call.
  final _Env site;

  /// The call as written, or null for the root.
  final ConstructorCall? call;
}

class _PrimitiveThunk extends _Thunk {
  _PrimitiveThunk(this.name, this.arguments, super.site, super.call);

  final FullyQualifiedWidgetName name;
  final Map<String, Object?> arguments;
}

class _TemplateThunk extends _Thunk {
  _TemplateThunk(this.resolved, this.arguments, super.site, super.call);

  final ResolvedName resolved;
  final Map<String, _Argument> arguments;
}

class _Builder {
  _Builder(this.node, this.env);

  final WidgetBuilderDeclaration node;
  final _Env env;
}

/// One expansion of a root or a builder's output.
class _Pass {
  _Pass(this.runtime);

  final CraftRuntime runtime;
  final List<ExpansionError> errors = <ExpansionError>[];
  final List<ExpandedState> states = <ExpandedState>[];
  final Set<String> seen = <String>{};
  final List<ExpansionPath> builders = <ExpansionPath>[];

  /// The depth of the node being evaluated or of the position being placed
  /// (see the `craft_limits` blueprint).
  int depth = 0;
  int _steps = 0;
  int _nodes = 0;

  TemplateRegistry get registry => runtime.registry;
  CraftLimits get limits => runtime.limits;

  /// Runs [body] one level deeper.
  T deeper<T>(T Function() body) {
    depth += 1;
    try {
      return body();
    } finally {
      depth -= 1;
    }
  }

  void _step() {
    _steps += 1;
    if (_steps > limits.maxSteps) {
      throw _Stop(
        ExpansionErrorKind.stepsExceeded,
        'The expansion took more than ${limits.maxSteps} steps.',
      );
    }
  }

  void _node() {
    _nodes += 1;
    if (_nodes > limits.maxNodes) {
      throw _Stop(
        ExpansionErrorKind.nodesExceeded,
        'The expansion has more than ${limits.maxNodes} nodes.',
      );
    }
  }

  /// Evaluates one node with [body], one level deeper, as one step.
  T _evaluating<T>(T Function() body) => deeper(() {
    _step();
    if (depth > limits.maxDepth) {
      throw _Failure(
        ExpansionErrorKind.depthExceeded,
        'A node is nested deeper than ${limits.maxDepth}.',
      );
    }
    return body();
  });

  /// The expansion of a pass that [stop] ended: one error node at [path].
  /// The runtime drops no instance because of it.
  Expansion stopped(_Stop stop, ExpansionPath path) {
    final ErrorNode node = ErrorNode(
      stop.kind,
      stop.message,
      List<Object>.unmodifiable(path),
    );
    return Expansion(node, const <ExpandedState>[], <ExpansionError>[
      ExpansionError(node),
    ]);
  }

  ErrorNode fail(
    ExpansionPath path,
    ExpansionErrorKind kind,
    String message, {
    FullyQualifiedWidgetName? template,
    SourceRange? source,
  }) {
    _node();
    final ErrorNode node = ErrorNode(
      kind,
      message,
      List<Object>.unmodifiable(path),
      template: template,
      source: source,
    );
    errors.add(ExpansionError(node));
    return node;
  }

  /// [expand], or an [ErrorNode] at [path] when it fails.
  Object guard(ExpansionPath path, Object Function() expand) {
    try {
      return expand();
    } on _Failure catch (failure) {
      return fail(
        path,
        failure.kind,
        failure.message,
        template: failure.template,
        source: failure.source,
      );
    }
  }

  /// A failure of [node], evaluated in [env].
  static _Failure _failure(
    ExpansionErrorKind kind,
    String message,
    _Env env,
    Object? node,
  ) => _Failure(kind, message)..locate(env, node);

  /// The root as a thunk whose arguments are the host's values.
  _Thunk thunk(ResolvedName resolved, Map<String, Object> arguments) {
    final _Env env = _Env(library: resolved.library);
    return resolved.isPrimitive
        ? _PrimitiveThunk(resolved.fullName, arguments, env, null)
        : _TemplateThunk(
            resolved,
            <String, _Argument>{
              for (final MapEntry<String, Object> a in arguments.entries)
                a.key: _Argument.value(a.value),
            },
            env,
            null,
          );
  }

  Object expandWidget(_Thunk thunk, ExpansionPath path) => guard(path, () {
    switch (thunk) {
      case _PrimitiveThunk():
        final Map<String, Object> arguments;
        try {
          arguments = <String, Object>{
            for (final MapEntry<String, Object?> a in thunk.arguments.entries)
              a.key: eval(a.value, thunk.site),
          };
        } on _Failure catch (failure) {
          failure.locate(thunk.site, thunk.call);
          rethrow;
        }
        final WidgetNode node = WidgetNode(
          thunk.name,
          deeper(
            () => <String, Object>{
              for (final MapEntry<String, Object> a in arguments.entries)
                a.key: place(a.value, <Object>[...path, a.key]),
            },
          ),
          List<Object>.unmodifiable(path),
        );
        _node();
        return node;
      case _TemplateThunk():
        final WidgetDeclaration declaration = thunk.resolved.declaration!;
        if (thunk.site.chain.any(
          (WidgetDeclaration d) => identical(d, declaration),
        )) {
          throw _failure(
            ExpansionErrorKind.recursiveWidget,
            '${widgetNameString(thunk.resolved.fullName)} is called inside '
            'its own expansion.',
            thunk.site,
            thunk.call,
          );
        }
        StateInstance? own;
        if (declaration.initialState != null) {
          own = runtime._instance(path, thunk.resolved, declaration);
          if (seen.add(
            CraftRuntime._instanceKey(path, thunk.resolved.fullName),
          )) {
            states.add(ExpandedState(own));
          }
        }
        final _Env scope = _Env(
          library: thunk.resolved.library,
          declaration: declaration.name,
          arguments: thunk.arguments,
          instance: own ?? thunk.site.instance,
          chain: <WidgetDeclaration>[...thunk.site.chain, declaration],
        );
        final Object root = eval(declaration.root, scope);
        return deeper(
          () => switch (root) {
            _Thunk() => expandWidget(root, path),
            HostWidget() => place(root, path),
            _ => throw _failure(
              ExpansionErrorKind.notAWidget,
              'The root of ${widgetNameString(thunk.resolved.fullName)} did '
              'not give a widget.',
              scope,
              declaration.root,
            ),
          },
        );
    }
  });

  /// Places an evaluated value at [path]: expands its widgets and gives its
  /// builders their position.
  Object place(Object value, ExpansionPath path) {
    if (value is _Thunk) return expandWidget(value, path);
    _node();
    switch (value) {
      case HostWidget():
        return HostWidgetNode(value.id, List<Object>.unmodifiable(path));
      case _Builder():
        builders.add(List<Object>.unmodifiable(path));
        return BuilderNode(
          List<Object>.unmodifiable(path),
          _PlacedBuilder(value, depth),
        );
      case List<Object>():
        return deeper(
          () => <Object>[
            for (int i = 0; i < value.length; i += 1)
              place(value[i], <Object>[...path, i]),
          ],
        );
      case Map<String, Object>():
        return deeper(
          () => <String, Object>{
            for (final MapEntry<String, Object> e in value.entries)
              e.key: place(e.value, <Object>[...path, e.key]),
          },
        );
      default:
        return value;
    }
  }

  /// Evaluates [node] in [env], one level deeper, as one step.
  Object eval(Object? node, _Env env) {
    try {
      return _evaluating(() => _eval(node, env));
    } on _Failure catch (failure) {
      failure.locate(env, node);
      rethrow;
    } on EvaluationException catch (failure) {
      throw _Failure.of(failure)..locate(env, node);
    }
  }

  Object _eval(Object? node, _Env env) => switch (node) {
    null || Missing() => missing,
    bool() ||
    int() ||
    double() ||
    String() ||
    HostHandler() ||
    HostWidget() => node,
    List<Object?>() => _list(node, env),
    Map<String, Object?>() => <String, Object>{
      for (final MapEntry<String, Object?> e in node.entries)
        e.key: eval(e.value, env),
    },
    ArgsReference() => _readArgs(node.parts, env),
    DataReference() => _read(runtime._data, node.parts),
    StateReference() => _read(env.instance?.value ?? missing, node.parts),
    LoopReference() =>
      node.loop >= 0 && node.loop < env.loops.length
          ? _read(env.loops[env.loops.length - 1 - node.loop], node.parts)
          : throw _Failure(
              ExpansionErrorKind.invalidValue,
              'loop${node.loop} has no enclosing loop.',
            ),
    WidgetBuilderArgReference() => _read(
      env.builderArguments[node.argumentName] ??
          (throw _Failure(
            ExpansionErrorKind.invalidValue,
            '${node.argumentName} is not the argument of an enclosing builder.',
          )),
      node.parts,
    ),
    SymbolReference() => registry.readSymbol(env.library, node),
    ConstructorCall() => _call(node, env),
    Switch() => _switch(node, env),
    WidgetBuilderDeclaration() => _Builder(node, env),
    EventHandler() => EventValue(
      node.eventName,
      _values(<String, Object>{
            for (final MapEntry<String, Object?> e
                in node.eventArguments.entries)
              e.key: eval(e.value, env),
          }, 'An argument of event "${node.eventName}"')
          as Map<String, Object>,
    ),
    SetStateHandler() => SetStateValue(
      env.instance ??
          (throw _Failure(
            ExpansionErrorKind.noState,
            'set ${node.stateReference} has no stateful template around it.',
          )),
      List<Object>.unmodifiable(node.stateReference.parts),
      _values(eval(node.value, env), 'The value of set ${node.stateReference}'),
    ),
    MediaReference() => readMedia(runtime._media, node.parts),
    ThemeReference() => throw _Failure(
      ExpansionErrorKind.notEvaluated,
      '$node is not evaluated by this engine.',
    ),
    _ => throw _Failure(
      ExpansionErrorKind.invalidValue,
      'A ${node.runtimeType} cannot be evaluated here.',
    ),
  };

  List<Object> _list(List<Object?> list, _Env env) {
    final List<Object> result = <Object>[];
    for (final Object? element in list) {
      _addElement(result, element, env);
    }
    return result;
  }

  /// Adds the elements that [element] gives: a loop one per item, a loop
  /// whose output is a loop those of the inner loop for each item.
  void _addElement(List<Object> result, Object? element, _Env env) {
    if (element is! Loop) {
      result.add(eval(element, env));
      return;
    }
    _evaluating(() {
      if (eval(element.input, env) case final List<Object> items) {
        for (final Object item in items) {
          _addElement(result, element.output, env.withLoop(item));
        }
      }
    });
  }

  Object _readArgs(List<Object> parts, _Env env) {
    if (parts.isEmpty) {
      return <String, Object>{
        for (final MapEntry<String, _Argument> a in env.arguments.entries)
          a.key: a.value.read(this),
      };
    }
    final _Argument? argument = env.arguments[parts.first];
    if (argument == null) return missing;
    return _read(argument.read(this), parts.sublist(1));
  }

  static Object _read(Object root, List<Object> parts) {
    Object current = root;
    for (final Object part in parts) {
      current = switch ((current, part)) {
        (final Map<String, Object> map, final String key) =>
          map[key] ?? missing,
        (final List<Object> list, final int index)
            when index >= 0 && index < list.length =>
          list[index],
        _ => missing,
      };
    }
    return current;
  }

  /// [value] when it holds only values, otherwise an `invalidValue` failure
  /// whose message says that what it found is not allowed in [place] (such
  /// as "the argument value of orElse"). Each node checked is one step.
  Object _values(Object value, String place, {bool handlers = false}) {
    _step();
    switch (value) {
      case List<Object>():
        for (final Object e in value) {
          _values(e, place, handlers: handlers);
        }
      case Map<String, Object>():
        for (final Object e in value.values) {
          _values(e, place, handlers: handlers);
        }
      case HandlerValue() when handlers:
        break;
      case _Thunk() || HostWidget() || _Builder() || HandlerValue():
        final String found = switch (value) {
          _PrimitiveThunk(:final FullyQualifiedWidgetName name) =>
            'the widget ${widgetNameString(name)}',
          _TemplateThunk(:final ResolvedName resolved) =>
            'the widget ${widgetNameString(resolved.fullName)}',
          HostWidget() => 'a host widget',
          _Builder() => 'a widget builder',
          _ => 'a handler',
        };
        throw _Failure(
          ExpansionErrorKind.invalidValue,
          '$place is $found, but must be a value'
          '${handlers ? ' or a handler' : ''}.',
        );
    }
    return value;
  }

  Object _call(ConstructorCall call, _Env env) {
    switch (registry.classify(
      call.name,
      library: env.library,
      declaration: env.declaration,
    )) {
      case AbsentCall():
        checkCallArguments(call, const <String>{});
        return missing;
      case HandlerApplication():
        checkCallArguments(call, const <String>{'handler', 'arguments'});
        final Object handler = _values(
          switch (call.arguments['handler']) {
            final Object node => eval(node, env),
            null => missing,
          },
          'The handler of call',
          handlers: true,
        );
        final Object arguments = _values(switch (call.arguments['arguments']) {
          final Object node => eval(node, env),
          null => const <String, Object>{},
        }, 'An argument of call');
        if (arguments is! Map<String, Object>) {
          throw _Failure(
            ExpansionErrorKind.invalidValue,
            'The arguments of call are not a map.',
          );
        }
        return HandlerCallValue(handler, arguments);
      case WidgetCall(widget: final ResolvedName resolved):
        return resolved.isPrimitive
            ? _PrimitiveThunk(resolved.fullName, call.arguments, env, call)
            : _TemplateThunk(
                resolved,
                <String, _Argument>{
                  for (final MapEntry<String, Object?> a
                      in call.arguments.entries)
                    a.key: _Argument.lazy(a.value, env),
                },
                env,
                call,
              );
      case FunctionCall(:final String key):
        final LocalFunction function = registry.functionsFor(env.library)[key]!;
        checkCallArguments(call, function.arguments.keys.toSet());
        return invokeFunction(key, function, <String, Object>{
          for (final MapEntry<String, Object?> a in call.arguments.entries)
            a.key: _values(
              eval(a.value, env),
              'The argument ${a.key} of ${call.name}',
            ),
        }, limits);
      case UnknownCall():
        if (call.name == env.declaration ||
            call.name == '${env.library}::${env.declaration}') {
          throw EvaluationException(
            EvaluationErrorKind.unknownFunction,
            '${call.name} calls itself, but a declaration cannot: its own '
            'name never resolves to it, so templates are not recursive.',
          );
        }
        throw EvaluationException(
          EvaluationErrorKind.unknownFunction,
          '${call.name} is neither a widget nor a function callable from '
          '${env.library}.',
        );
    }
  }

  Object _switch(Switch node, _Env env) {
    final Object input = _values(eval(node.input, env), 'The input of switch');
    for (final MapEntry<Object?, Object> c in node.outputs.entries) {
      if (c.key == null) continue;
      if (valueEquals(input, _values(eval(c.key, env), 'A key of switch'))) {
        return eval(c.value, env);
      }
    }
    return node.outputs.containsKey(null)
        ? eval(node.outputs[null], env)
        : missing;
  }
}
