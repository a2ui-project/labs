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

import 'a2ui_catalog.dart';
import 'expansion.dart';
import 'limits.dart';
import 'rfw/model.dart';
import 'runtime.dart';

/// A resolved property of an A2UI component node, as an A2UI renderer hands
/// it to a component implementation (see the `a2ui_integration` blueprint,
/// requirement 2). [host] is the renderer's own object for it (a binding,
/// an action, a child node), which the integration never looks into.
sealed class A2uiProp {
  const A2uiProp();
}

/// A dynamic value resolved to [value]; [path] is the data path it is bound
/// to, when it is bound to one (the case in which A2UI can write it).
final class BoundValue extends A2uiProp {
  /// Creates a resolved dynamic value.
  const BoundValue(this.value, {this.path, this.host});

  /// The resolved value, JSON; null when there is none.
  final Object? value;

  /// The data path, or null when the value is not bound to one.
  final String? path;

  /// The renderer's binding, through which a write goes.
  final Object? host;
}

/// An action, which runs when invoked.
final class ActionProp extends A2uiProp {
  /// Wraps the renderer's action [host].
  const ActionProp(this.host);

  /// The renderer's action.
  final Object host;
}

/// A single child component.
final class ChildProp extends A2uiProp {
  /// Wraps the renderer's child node [host].
  const ChildProp(this.host);

  /// The renderer's child node.
  final Object host;
}

/// A list of child components.
final class ChildListProp extends A2uiProp {
  /// Wraps the renderer's child nodes [hosts].
  const ChildListProp(this.hosts);

  /// The renderer's child nodes, in order.
  final List<Object> hosts;
}

/// What a host handler of [TemplateArgs] does when the template fires it.
sealed class _HandlerTarget {
  const _HandlerTarget(this.property);

  final String property;
}

final class _RunAction extends _HandlerTarget {
  const _RunAction(super.property, this.host);

  final Object host;
}

final class _WriteValue extends _HandlerTarget {
  const _WriteValue(super.property, this.path, this.host);

  final String path;
  final Object? host;
}

/// Something the A2UI renderer must do because a template fired a handler.
sealed class A2uiEffect {
  const A2uiEffect();

  /// The effect in the JSON form of the `a2ui_integration` conformance
  /// cases.
  Map<String, Object?> toJson();
}

/// Dispatch the action [payload] from the template's component.
final class DispatchAction extends A2uiEffect {
  /// Creates the dispatch of the event [name] with [context].
  const DispatchAction(this.name, this.context);

  /// The event's name.
  final String name;

  /// The event's context, JSON.
  final Map<String, Object?> context;

  /// The A2UI action payload.
  Map<String, Object?> get payload => <String, Object?>{
    'event': <String, Object?>{'name': name, 'context': context},
  };

  @override
  Map<String, Object?> toJson() => <String, Object?>{'dispatch': payload};
}

/// Invoke the action of [property].
final class RunAction extends A2uiEffect {
  /// Creates the invocation of [host], the action of [property].
  const RunAction(this.property, this.host);

  /// The property whose action runs.
  final String property;

  /// The renderer's action.
  final Object host;

  @override
  Map<String, Object?> toJson() => <String, Object?>{'run': property};
}

/// Write [value] to the data [path] that [property] is bound to.
final class WriteData extends A2uiEffect {
  /// Creates the write of [value] through [host].
  const WriteData(this.property, this.path, this.value, this.host);

  /// The property whose binding is written.
  final String property;

  /// The data path.
  final String path;

  /// The value, JSON.
  final Object? value;

  /// The renderer's binding.
  final Object? host;

  @override
  Map<String, Object?> toJson() => <String, Object?>{
    'write': <String, Object?>{'path': path, 'value': value},
  };
}

/// The arguments a template receives from the resolved props of its
/// component node, and what its host handlers and host widgets stand for.
class TemplateArgs {
  TemplateArgs._(this.args, this.widgets, this._handlers, this.beyondLimits);

  /// Maps [props] (property name → [A2uiProp], and the check results
  /// `isValid` and `validationErrors` as the renderer gives them) to the
  /// arguments of a template with [interface].
  ///
  /// A value beyond [limits] (by default [CraftLimits.defaults]; give the
  /// registry's) becomes a [BeyondLimits], so that the runtime stops (see
  /// the `limits` blueprint).
  factory TemplateArgs.from(
    TemplateInterface interface,
    Map<String, Object?> props, {
    CraftLimits? limits,
  }) {
    final CraftLimits checked = limits ?? CraftLimits.defaults;
    CraftLimitException? beyond;
    final Map<String, Object> args = <String, Object>{};
    final Map<String, Object> widgets = <String, Object>{};
    final Map<String, _HandlerTarget> handlers = <String, _HandlerTarget>{};
    for (final MapEntry<String, ArgKind> p in interface.properties.entries) {
      final String name = p.key;
      switch ((p.value, props[name])) {
        case (final ArgKind kind, final BoundValue bound) when kind.isValue:
          try {
            if (_value(name, bound.value, checked) case final Object value) {
              args[name] = value;
            }
          } on CraftLimitException catch (failure) {
            beyond ??= failure;
            args[name] = BeyondLimits(failure);
          }
          final String setter = setterName(name);
          if (bound.path case final String path
              when !interface.properties.containsKey(setter)) {
            args[setter] = HostHandler(setter);
            handlers[setter] = _WriteValue(name, path, bound.host);
          }
        case (ArgKind.action, final ActionProp action):
          args[name] = HostHandler(name);
          handlers[name] = _RunAction(name, action.host);
        case (ArgKind.child, final ChildProp child):
          args[name] = HostWidget(name);
          widgets[name] = child.host;
        case (ArgKind.children, final ChildListProp children):
          args[name] = <Object>[
            for (int i = 0; i < children.hosts.length; i += 1)
              HostWidget('$name.$i'),
          ];
          for (int i = 0; i < children.hosts.length; i += 1) {
            widgets['$name.$i'] = children.hosts[i];
          }
        default:
      }
    }
    if (interface.checkable) {
      if (props['isValid'] case final bool isValid) args['isValid'] = isValid;
      if (props['validationErrors'] case final List<Object?> errors) {
        args['validationErrors'] = <Object>[...errors.whereType<String>()];
      }
    }
    return TemplateArgs._(args, widgets, handlers, beyond);
  }

  /// The first value beyond the limits, or null when there is none.
  final CraftLimitException? beyondLimits;

  /// The arguments: values, [HostHandler]s and [HostWidget]s.
  final Map<String, Object> args;

  /// The renderer's child node of each [HostWidget] in [args], by id.
  final Map<String, Object> widgets;

  final Map<String, _HandlerTarget> _handlers;

  /// What the renderer must do for [event], which firing a handler of an
  /// expansion with these arguments gave.
  List<A2uiEffect> effects(HostEvent event) => switch (event) {
    TemplateEvent() => <A2uiEffect>[
      DispatchAction(event.name, a2uiJson(event.arguments)! as JsonMap),
    ],
    HostHandlerEvent() => switch (_handlers[event.handler.id]) {
      _RunAction(:final String property, :final Object host) => <A2uiEffect>[
        RunAction(property, host),
      ],
      _WriteValue(:final String property, :final String path, :final host) =>
        switch (event.arguments['value']) {
          null || Missing() => const <A2uiEffect>[],
          final Object value => <A2uiEffect>[
            WriteData(property, path, a2uiJson(value), host),
          ],
        },
      _ => const <A2uiEffect>[],
    },
  };

  /// [value] as the template argument [name], or null when it is null or
  /// not JSON. Checked as an entry of the arguments' map, as the runtime
  /// checks it.
  ///
  /// Throws a [CraftLimitException] when it is beyond [limits].
  static Object? _value(String name, Object? value, CraftLimits limits) {
    if (value == null) return null;
    try {
      return (limitedValue(<String, Object?>{name: value}, limits)
          as Map<String, Object>)[name];
    } on FormatException {
      return null;
    }
  }
}

/// A JSON object.
typedef JsonMap = Map<String, Object?>;

/// [value], a value, as JSON: absent map entries are left out, absent list
/// elements are null, and an absent [value] is null.
Object? a2uiJson(Object value) => switch (value) {
  Missing() => null,
  List<Object>() => <Object?>[for (final Object e in value) a2uiJson(e)],
  Map<String, Object>() => <String, Object?>{
    for (final MapEntry<String, Object> e in value.entries)
      if (e.value is! Missing) e.key: a2uiJson(e.value),
  },
  _ => value,
};
