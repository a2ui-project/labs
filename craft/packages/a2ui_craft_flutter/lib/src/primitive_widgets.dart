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

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:flutter/widgets.dart';

/// Builds the Flutter widget of one primitive from its expanded arguments.
typedef PrimitiveWidgetBuilder =
    Widget Function(BuildContext context, PrimitiveArguments arguments);

/// A primitive rendered with Flutter: its builder and the static metadata
/// that templates can read (see the `craft_template_registry` blueprint).
class PrimitiveWidget {
  /// Creates a primitive with [builder] and [meta].
  const PrimitiveWidget(this.builder, {this.meta = const <String, Object?>{}});

  /// Builds the widget.
  final PrimitiveWidgetBuilder builder;

  /// The metadata, a map value.
  final Map<String, Object?> meta;
}

/// A library of primitives rendered with Flutter. Register it in the
/// `TemplateRegistry` with `setPrimitiveLibrary`, and give it to [CraftView]
/// under the same library name.
class PrimitiveWidgetLibrary extends PrimitiveLibrary {
  /// Creates a library of [widgets], by name.
  const PrimitiveWidgetLibrary(this.widgets);

  /// The primitives, by name.
  final Map<String, PrimitiveWidget> widgets;

  @override
  Iterable<String> get widgetNames => widgets.keys;

  @override
  Map<String, Map<String, Object?>> get widgetMeta =>
      <String, Map<String, Object?>>{
        for (final MapEntry<String, PrimitiveWidget> w in widgets.entries)
          w.key: w.value.meta,
      };
}

/// The expanded arguments of one primitive, as its builder reads them.
///
/// Values are those of the expansion: booleans, numbers, strings, lists,
/// maps and [missing] for the absent value. Widgets, handlers and builders
/// have their own accessors.
class PrimitiveArguments {
  /// Wraps [node]; [render] renders a node of the expansion, [fire] fires a
  /// handler with event arguments, and [build] expands a builder's output.
  const PrimitiveArguments(
    this.node, {
    required Widget Function(Object node) render,
    required void Function(Object handler, Map<String, Object?> arguments) fire,
    required Widget Function(BuilderNode builder, Object key, Object? argument)
    build,
  }) : _render = render,
       _fire = fire,
       _build = build;

  /// The primitive's node.
  final WidgetNode node;

  final Widget Function(Object node) _render;
  final void Function(Object handler, Map<String, Object?> arguments) _fire;
  final Widget Function(BuilderNode builder, Object key, Object? argument)
  _build;

  /// The argument [name], or [missing] when the call does not pass it.
  Object operator [](String name) => node.arguments[name] ?? missing;

  /// The argument [name] when it is a [T], otherwise null.
  T? value<T extends Object>(String name) => switch (this[name]) {
    final T value => value,
    _ => null,
  };

  /// The widget of the argument [name] when it is a widget or an error
  /// placeholder, otherwise null.
  Widget? child(String name) => _widget(this[name]);

  /// The widgets of the list in the argument [name]: one for each element
  /// that is a widget or an error placeholder, skipping the others (an
  /// absent element is no child).
  List<Widget> children(String name) => switch (this[name]) {
    final List<Object> list => <Widget>[
      for (final Object element in list)
        if (_widget(element) case final Widget widget) widget,
    ],
    _ => const <Widget>[],
  };

  Widget? _widget(Object value) =>
      value is WidgetNode || value is ErrorNode ? _render(value) : null;

  /// A callback that fires the argument [name] with no event arguments, or
  /// null when firing it would do nothing (see `isRunnableHandler`), so that
  /// the control can show itself disabled.
  VoidCallback? handler(String name) {
    final Object handler = this[name];
    if (!isRunnableHandler(handler)) return null;
    return () => _fire(handler, const <String, Object?>{});
  }

  /// A callback that fires the argument [name] with the event arguments
  /// `{value: v}`, or null when firing it would do nothing.
  ValueChanged<Object?>? valueHandler(String name) {
    final Object handler = this[name];
    if (!isRunnableHandler(handler)) return null;
    return (Object? value) => _fire(handler, <String, Object?>{'value': value});
  }

  /// A function that builds the output of the builder in the argument
  /// [name] for a key and an argument, or null when it is not a builder.
  Widget Function(Object key, Object? argument)? builder(String name) =>
      switch (this[name]) {
        final BuilderNode builder => (Object key, Object? argument) => _build(
          builder,
          key,
          argument,
        ),
        _ => null,
      };
}
