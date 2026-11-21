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
import 'package:flutter/foundation.dart';
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

/// Where a [CraftView] takes the media context of its runtime from.
enum MediaSource {
  /// The space the view is given: the maximum width and height of its
  /// layout constraints, an unbounded one replaced by that of the size of
  /// the nearest [MediaQuery]. Like every [LayoutBuilder], the view then
  /// cannot answer intrinsic size queries; use [window] or [host] where a
  /// parent asks them.
  layout,

  /// The size of the nearest [MediaQuery]: the window in an app.
  window,

  /// The host: the view leaves the runtime's media context alone.
  host,
}

/// Renders the expansion of [runtime] with the widgets of [libraries], and
/// expands it again whenever the runtime notifies a change.
///
/// Unless [media] is [MediaSource.host], the view sets the runtime's media
/// context before it renders (see [MediaContext.fromSize]): a size from
/// [media], the platform from [defaultTargetPlatform] (`web` on the web),
/// and the reduced-motion preference from [MediaQueryData.disableAnimations].
/// It renders the expansion for that media context, so a change of size
/// class shows up in the same frame, and notifies the runtime's other
/// listeners after that frame, so that they may rebuild.
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
    this.media = MediaSource.layout,
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

  /// Where the runtime's media context comes from. A runtime should be
  /// shown by at most one view that sets it.
  final MediaSource media;

  @override
  State<CraftView> createState() => _CraftViewState();
}

class _CraftViewState extends State<CraftView> {
  /// The expansion rendered; null when the runtime changed since.
  Expansion? _expansion;
  final List<Object> _pendingErrors = <Object>[];
  bool _expansionScheduled = false;

  /// Whether the view is notifying of its own media change, so that it
  /// does not take the notification for a change from elsewhere.
  bool _notifyingMedia = false;

  /// Whether a notification of a media change is scheduled.
  bool _mediaNotificationScheduled = false;

  /// The errors of rendering ([ExpansionError]s of builder outputs and
  /// [MissingPrimitiveWidget]s) already reported for [_expansion], by kind
  /// and path, so that rebuilds do not report them again.
  final Set<String> _reported = <String>{};

  @override
  void initState() {
    super.initState();
    widget.runtime.addListener(_changed);
  }

  @override
  void didUpdateWidget(CraftView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.runtime, widget.runtime)) {
      oldWidget.runtime.removeListener(_changed);
      widget.runtime.addListener(_changed);
      _expansion = null;
    }
  }

  @override
  void dispose() {
    widget.runtime.removeListener(_changed);
    super.dispose();
  }

  Expansion _expand() {
    final Expansion expansion = widget.runtime.expand();
    _reported.clear();
    _report(expansion.errors);
    return expansion;
  }

  void _invalidate() => _expansion = null;

  /// Expands again; while a frame is being built (a host changed the
  /// runtime from a build method), once after that frame however many
  /// changes come, so that no rebuild is requested during a build.
  void _changed() {
    if (_notifyingMedia) return;
    if (SchedulerBinding.instance.schedulerPhase !=
        SchedulerPhase.persistentCallbacks) {
      setState(_invalidate);
      return;
    }
    if (_expansionScheduled) return;
    _expansionScheduled = true;
    SchedulerBinding.instance.addPostFrameCallback((Duration _) {
      _expansionScheduled = false;
      if (mounted) setState(_invalidate);
    });
  }

  /// Sets the runtime's media context for a space of [size].
  void _setMedia(BuildContext context, Size size) {
    final MediaContext media = MediaContext.fromSize(
      size.width,
      size.height,
      platform: kIsWeb ? HostPlatform.web : _platforms[defaultTargetPlatform],
      reducedMotion: MediaQuery.maybeDisableAnimationsOf(context) ?? false,
    );
    final CraftRuntime runtime = widget.runtime;
    if (!runtime.setMedia(media, notify: false)) return;
    _expansion = null;
    if (_mediaNotificationScheduled) return;
    _mediaNotificationScheduled = true;
    SchedulerBinding.instance.addPostFrameCallback((Duration _) {
      _mediaNotificationScheduled = false;
      _notifyingMedia = true;
      try {
        runtime.refresh();
      } finally {
        _notifyingMedia = false;
      }
    });
  }

  static const Map<TargetPlatform, HostPlatform> _platforms =
      <TargetPlatform, HostPlatform>{
        TargetPlatform.android: HostPlatform.android,
        TargetPlatform.fuchsia: HostPlatform.fuchsia,
        TargetPlatform.iOS: HostPlatform.ios,
        TargetPlatform.linux: HostPlatform.linux,
        TargetPlatform.macOS: HostPlatform.macos,
        TargetPlatform.windows: HostPlatform.windows,
      };

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

  Widget _renderRoot() => _render((_expansion ??= _expand()).root);

  @override
  Widget build(BuildContext context) {
    switch (widget.media) {
      case MediaSource.host:
        return _renderRoot();
      case MediaSource.window:
        _setMedia(context, MediaQuery.sizeOf(context));
        return _renderRoot();
      case MediaSource.layout:
        return LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) {
            final Size window = MediaQuery.sizeOf(context);
            _setMedia(
              context,
              Size(
                constraints.hasBoundedWidth
                    ? constraints.maxWidth
                    : window.width,
                constraints.hasBoundedHeight
                    ? constraints.maxHeight
                    : window.height,
              ),
            );
            return _renderRoot();
          },
        );
    }
  }
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
