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
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import 'primitive_widgets.dart';

/// A node of an expansion that the adapter cannot render: a primitive with
/// no [PrimitiveWidget] in the libraries given to [CraftView].
class MissingPrimitiveWidget {
  /// Reports [node].
  const MissingPrimitiveWidget(this.node);

  /// The primitive's node.
  final WidgetNode node;

  @override
  String toString() =>
      'MissingPrimitiveWidget(${widgetNameString(node.name)} at '
      '${node.path.join('.')})';
}

/// Renders the expansion of [runtime] with the widgets of [libraries], and
/// expands it again whenever the runtime notifies a change.
///
/// Firing a handler goes to the runtime; the events it gives go to
/// [onEvent]. Every error of an expansion, of a builder's output or of a
/// firing (an [ExpansionError], a [FireError] or a
/// [MissingPrimitiveWidget]) goes to [onError] after the frame that renders
/// it, unless the view is gone by then. An error found while rendering (in a
/// builder's output, or a primitive without a widget) is reported once per
/// expansion of the root, however often it is rebuilt.
class CraftView extends StatefulWidget {
  /// Creates a view of [runtime].
  const CraftView({
    super.key,
    required this.runtime,
    required this.libraries,
    this.onEvent,
    this.onError,
    this.errorBuilder,
    this.hostWidgetBuilder,
  });

  /// The runtime whose expansion is rendered.
  final CraftRuntime runtime;

  /// The Flutter widgets of the primitives, by library name.
  final Map<LibraryName, PrimitiveWidgetLibrary> libraries;

  /// Receives the events that firing gives.
  final ValueChanged<HostEvent>? onEvent;

  /// Receives the errors.
  final ValueChanged<Object>? onError;

  /// Builds the placeholder of an error node; by default a small
  /// [ErrorWidget].
  final Widget Function(BuildContext context, ErrorNode node)? errorBuilder;

  /// Builds the widget a host widget node stands for (see `HostWidget`);
  /// without it, a host widget node renders nothing.
  final Widget Function(BuildContext context, HostWidgetNode node)?
  hostWidgetBuilder;

  @override
  State<CraftView> createState() => _CraftViewState();
}

class _CraftViewState extends State<CraftView> {
  late Expansion _expansion;
  final List<Object> _pendingErrors = <Object>[];
  bool _expansionScheduled = false;

  /// The errors of rendering ([ExpansionError]s of builder outputs and
  /// [MissingPrimitiveWidget]s) already reported for [_expansion], by kind
  /// and path, so that rebuilds do not report them again.
  final Set<String> _reported = <String>{};

  @override
  void initState() {
    super.initState();
    widget.runtime.addListener(_changed);
    _expand();
  }

  @override
  void didUpdateWidget(CraftView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.runtime, widget.runtime)) {
      oldWidget.runtime.removeListener(_changed);
      widget.runtime.addListener(_changed);
      _expand();
    }
  }

  @override
  void dispose() {
    widget.runtime.removeListener(_changed);
    super.dispose();
  }

  void _expand() {
    _expansion = widget.runtime.expand();
    _reported.clear();
    _report(_expansion.errors);
  }

  /// Expands again; while a frame is being built (a host changed the
  /// runtime from a build method), once after that frame however many
  /// changes come, so that no rebuild is requested during a build.
  void _changed() {
    if (SchedulerBinding.instance.schedulerPhase !=
        SchedulerPhase.persistentCallbacks) {
      setState(_expand);
      return;
    }
    if (_expansionScheduled) return;
    _expansionScheduled = true;
    SchedulerBinding.instance.addPostFrameCallback((Duration _) {
      _expansionScheduled = false;
      if (mounted) setState(_expand);
    });
  }

  /// Reports [error] unless it was already reported for this expansion.
  void _reportOnce(String key, Object error) {
    if (_reported.add(key)) _report(<Object>[error]);
  }

  void _report(Iterable<Object> errors) {
    if (errors.isEmpty || widget.onError == null) return;
    final bool schedule = _pendingErrors.isEmpty;
    _pendingErrors.addAll(errors);
    if (!schedule) return;
    SchedulerBinding.instance.addPostFrameCallback((Duration _) {
      final List<Object> errors = List<Object>.of(_pendingErrors);
      _pendingErrors.clear();
      final ValueChanged<Object>? onError = widget.onError;
      if (mounted && onError != null) errors.forEach(onError);
    });
    SchedulerBinding.instance.ensureVisualUpdate();
  }

  void _fire(Object handler, Map<String, Object?> arguments) {
    final FireResult result = widget.runtime.fire(handler, arguments);
    if (widget.onEvent case final ValueChanged<HostEvent> onEvent) {
      result.events.forEach(onEvent);
    }
    _report(result.errors);
  }

  Widget _buildOutput(BuilderNode builder, Object key, Object? argument) {
    final Expansion output = widget.runtime.expandBuilder(
      builder,
      key,
      argument,
    );
    for (final ExpansionError error in output.errors) {
      _reportOnce('${error.kind.name} ${error.path}', error);
    }
    return _render(output.root);
  }

  Widget _render(Object node) => switch (node) {
    WidgetNode() => _NodeWidget(node: node, view: this),
    HostWidgetNode() => Builder(
      builder: (BuildContext context) =>
          widget.hostWidgetBuilder?.call(context, node) ??
          const SizedBox.shrink(),
    ),
    ErrorNode() => Builder(
      builder: (BuildContext context) =>
          widget.errorBuilder?.call(context, node) ??
          _placeholder(node.message),
    ),
    _ => throw ArgumentError.value(node, 'node', 'Not a node of an expansion'),
  };

  @override
  Widget build(BuildContext context) => _render(_expansion.root);
}

/// The default placeholder: an [ErrorWidget] of a fixed small size, so that
/// it fits in any layout.
Widget _placeholder(String message) =>
    SizedBox.square(dimension: 24, child: ErrorWidget(message));

/// One primitive of the expansion.
class _NodeWidget extends StatelessWidget {
  const _NodeWidget({required this.node, required this.view});

  final WidgetNode node;
  final _CraftViewState view;

  @override
  Widget build(BuildContext context) {
    final PrimitiveWidget? primitive =
        view.widget.libraries[node.name.library]?.widgets[node.name.widget];
    if (primitive == null) {
      view._reportOnce('missing ${node.path}', MissingPrimitiveWidget(node));
      return _placeholder(MissingPrimitiveWidget(node).toString());
    }
    return primitive.builder(
      context,
      PrimitiveArguments(
        node,
        render: view._render,
        fire: view._fire,
        build: view._buildOutput,
      ),
    );
  }
}
