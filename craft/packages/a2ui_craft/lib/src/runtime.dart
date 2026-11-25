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
  /// (see [args] and [data]); so do their setters.
  CraftRuntime(
    this.registry, {
    required this.library,
    required this.widget,
    Map<String, Object?> args = const <String, Object?>{},
    Object? data,
    MediaContext? media,
  }) : _args = _hostArguments(args),
       _data = _hostData(data),
       _media = media;

  /// The libraries and functions templates use.
  final TemplateRegistry registry;

  /// The library the root widget name is resolved from.
  final LibraryName library;

  /// The root widget's name, as a call in [library] would write it.
  final String widget;

  Map<String, Object> _args;
  Object _data;
  MediaContext? _media;
  final Map<String, StateInstance> _instances = <String, StateInstance>{};
  final List<void Function()> _listeners = <void Function()>[];

  /// The root's arguments: values, possibly holding [HostHandler]s and
  /// [HostWidget]s.
  Map<String, Object> get args => _args;
  set args(Map<String, Object?> value) {
    _args = _hostArguments(value);
    _notify();
  }

  /// The data that `data.` references read: a value.
  Object get data => _data;
  set data(Object? value) {
    _data = _hostData(value);
    _notify();
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
  Expansion expand() {
    final _Pass pass = _Pass(this);
    final ResolvedName? resolved = switch (registry.classify(
      widget,
      library: library,
    )) {
      WidgetCall(widget: final ResolvedName name) => name,
      _ => null,
    };
    final Object root = resolved == null
        ? pass.fail(
            const <Object>[],
            ExpansionErrorKind.notAWidget,
            '$widget is not a widget visible from $library.',
          )
        : pass.expandWidget(
            pass.thunk(resolved, <String, Object>{..._args}),
            const <Object>[],
          );
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
    final _Builder closure = builder.closure as _Builder;
    final ExpansionPath path = <Object>[...builder.path, key];
    final Object root = pass.guard(path, () {
      final Object output = pass.eval(
        closure.node.widget,
        closure.env.withBuilderArgument(
          closure.node.argumentName,
          _hostValue(argument, host: false),
        ),
      );
      return switch (output) {
        _Thunk() => pass.expandWidget(output, path),
        HostWidget() => pass.place(output, path),
        _ => throw _Failure(
          ExpansionErrorKind.notAWidget,
          'The builder did not give a widget.',
        ),
      };
    });
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

    run(
      handler,
      _hostValue(eventArguments, host: false) as Map<String, Object>,
    );
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

  static Map<String, Object> _hostArguments(Map<String, Object?> args) =>
      _hostValue(args, host: true) as Map<String, Object>;

  static Object _hostData(Object? data) => _hostValue(data, host: false);

  /// Converts host input into a value, as `toValue` does, also keeping
  /// [HostHandler]s and [HostWidget]s when [host] is true.
  static Object _hostValue(Object? value, {required bool host}) {
    try {
      return switch (value) {
        HostHandler() when host => value,
        HostWidget() when host => value,
        List<Object?>() => <Object>[
          for (final Object? e in value) _hostValue(e, host: host),
        ],
        Map<Object?, Object?>() when isStringKeyed(value) => <String, Object>{
          for (final MapEntry<Object?, Object?> e in value.entries)
            e.key! as String: _hostValue(e.value, host: host),
        },
        _ => toValue(value),
      };
    } on FormatException catch (error) {
      throw ArgumentError.value(value, 'value', error.message);
    }
  }
}

/// An expansion failure, turned into an [ErrorNode] at the innermost widget.
class _Failure implements Exception {
  _Failure(this.kind, this.message);

  final ExpansionErrorKind kind;
  final String message;
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
  _Thunk(this.site);

  /// The scope of the call.
  final _Env site;
}

class _PrimitiveThunk extends _Thunk {
  _PrimitiveThunk(this.name, this.arguments, super.site);

  final FullyQualifiedWidgetName name;
  final Map<String, Object?> arguments;
}

class _TemplateThunk extends _Thunk {
  _TemplateThunk(this.resolved, this.arguments, super.site);

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

  TemplateRegistry get registry => runtime.registry;

  ErrorNode fail(ExpansionPath path, ExpansionErrorKind kind, String message) {
    final ErrorNode node = ErrorNode(
      kind,
      message,
      List<Object>.unmodifiable(path),
    );
    errors.add(ExpansionError(node));
    return node;
  }

  /// [expand], or an [ErrorNode] at [path] when it fails.
  Object guard(ExpansionPath path, Object Function() expand) {
    try {
      return expand();
    } on _Failure catch (failure) {
      return fail(path, failure.kind, failure.message);
    } on EvaluationException catch (failure) {
      return fail(
        path,
        ExpansionErrorKind.values.byName(failure.kind.name),
        failure.message,
      );
    }
  }

  /// The root as a thunk whose arguments are the host's values.
  _Thunk thunk(ResolvedName resolved, Map<String, Object> arguments) {
    final _Env env = _Env(library: resolved.library);
    return resolved.isPrimitive
        ? _PrimitiveThunk(resolved.fullName, arguments, env)
        : _TemplateThunk(resolved, <String, _Argument>{
            for (final MapEntry<String, Object> a in arguments.entries)
              a.key: _Argument.value(a.value),
          }, env);
  }

  Object expandWidget(_Thunk thunk, ExpansionPath path) => guard(path, () {
    switch (thunk) {
      case _PrimitiveThunk():
        final Map<String, Object> arguments = <String, Object>{
          for (final MapEntry<String, Object?> a in thunk.arguments.entries)
            a.key: eval(a.value, thunk.site),
        };
        return WidgetNode(thunk.name, <String, Object>{
          for (final MapEntry<String, Object> a in arguments.entries)
            a.key: place(a.value, <Object>[...path, a.key]),
        }, List<Object>.unmodifiable(path));
      case _TemplateThunk():
        final WidgetDeclaration declaration = thunk.resolved.declaration!;
        if (thunk.site.chain.any(
          (WidgetDeclaration d) => identical(d, declaration),
        )) {
          throw _Failure(
            ExpansionErrorKind.recursiveWidget,
            '${widgetNameString(thunk.resolved.fullName)} is called inside '
            'its own expansion.',
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
        final Object root = eval(
          declaration.root,
          _Env(
            library: thunk.resolved.library,
            declaration: declaration.name,
            arguments: thunk.arguments,
            instance: own ?? thunk.site.instance,
            chain: <WidgetDeclaration>[...thunk.site.chain, declaration],
          ),
        );
        return switch (root) {
          _Thunk() => expandWidget(root, path),
          HostWidget() => place(root, path),
          _ => throw _Failure(
            ExpansionErrorKind.notAWidget,
            'The root of ${widgetNameString(thunk.resolved.fullName)} did not '
            'give a widget.',
          ),
        };
    }
  });

  /// Places an evaluated value at [path]: expands its widgets and gives its
  /// builders their position.
  Object place(Object value, ExpansionPath path) {
    switch (value) {
      case _Thunk():
        return expandWidget(value, path);
      case HostWidget():
        return HostWidgetNode(value.id, List<Object>.unmodifiable(path));
      case _Builder():
        builders.add(List<Object>.unmodifiable(path));
        return BuilderNode(List<Object>.unmodifiable(path), value);
      case List<Object>():
        return <Object>[
          for (int i = 0; i < value.length; i += 1)
            place(value[i], <Object>[...path, i]),
        ];
      case Map<String, Object>():
        return <String, Object>{
          for (final MapEntry<String, Object> e in value.entries)
            e.key: place(e.value, <Object>[...path, e.key]),
        };
      default:
        return value;
    }
  }

  Object eval(Object? node, _Env env) => switch (node) {
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
      _values(eval(node.eventArguments, env)) as Map<String, Object>,
    ),
    SetStateHandler() => SetStateValue(
      env.instance ??
          (throw _Failure(
            ExpansionErrorKind.noState,
            'set ${node.stateReference} has no stateful template around it.',
          )),
      List<Object>.unmodifiable(node.stateReference.parts),
      _values(eval(node.value, env)),
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
      if (element is Loop) {
        if (eval(element.input, env) case final List<Object> items) {
          for (final Object item in items) {
            result.add(eval(element.output, env.withLoop(item)));
          }
        }
      } else {
        result.add(eval(element, env));
      }
    }
    return result;
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

  /// [value] when it holds only values, otherwise an `invalidValue` failure.
  static Object _values(Object value, {bool handlers = false}) {
    switch (value) {
      case List<Object>():
        for (final Object e in value) {
          _values(e, handlers: handlers);
        }
      case Map<String, Object>():
        for (final Object e in value.values) {
          _values(e, handlers: handlers);
        }
      case HandlerValue() when handlers:
        break;
      case _Thunk() || HostWidget() || _Builder() || HandlerValue():
        throw _Failure(
          ExpansionErrorKind.invalidValue,
          'A ${handlers ? 'widget or builder' : 'widget, builder or handler'} '
          'is not allowed here.',
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
          eval(call.arguments['handler'], env),
          handlers: true,
        );
        final Object arguments = _values(
          eval(call.arguments['arguments'] ?? const <String, Object?>{}, env),
        );
        if (arguments is! Map<String, Object>) {
          throw _Failure(
            ExpansionErrorKind.invalidValue,
            'The arguments of call are not a map.',
          );
        }
        return HandlerCallValue(handler, arguments);
      case WidgetCall(widget: final ResolvedName resolved):
        return resolved.isPrimitive
            ? _PrimitiveThunk(resolved.fullName, call.arguments, env)
            : _TemplateThunk(resolved, <String, _Argument>{
                for (final MapEntry<String, Object?> a
                    in call.arguments.entries)
                  a.key: _Argument.lazy(a.value, env),
              }, env);
      case FunctionCall(:final String key):
        final LocalFunction function = registry.functionsFor(env.library)[key]!;
        checkCallArguments(call, function.arguments.keys.toSet());
        return invokeFunction(key, function, <String, Object>{
          for (final MapEntry<String, Object?> a in call.arguments.entries)
            a.key: _values(eval(a.value, env)),
        });
      case UnknownCall():
        throw EvaluationException(
          EvaluationErrorKind.unknownFunction,
          '${call.name} is neither a widget nor a function callable from '
          '${env.library}.',
        );
    }
  }

  Object _switch(Switch node, _Env env) {
    final Object input = _values(eval(node.input, env));
    for (final MapEntry<Object?, Object> c in node.outputs.entries) {
      if (c.key == null) continue;
      if (valueEquals(input, _values(eval(c.key, env)))) {
        return eval(c.value, env);
      }
    }
    return node.outputs.containsKey(null)
        ? eval(node.outputs[null], env)
        : missing;
  }
}
