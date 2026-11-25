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

import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

/// Builds its child for the space it is given, like [LayoutBuilder], but
/// also answers intrinsic size queries.
///
/// The space is the maximum size of the layout constraints, an unbounded
/// axis taking that of [window]. A [LayoutBuilder] builds only in layout, so
/// it has no child to ask when a parent such as [IntrinsicWidth] queries its
/// size first. This widget also builds in the build phase, for the space of
/// its last layout (null before the first one), and builds again during
/// layout only when the space differs; intrinsic queries go to the child as
/// last built.
class SpaceBuilder extends RenderObjectWidget {
  /// Creates a builder of [builder] under a [window].
  const SpaceBuilder({super.key, required this.window, required this.builder});

  /// The size of an unbounded axis.
  final Size window;

  /// Builds the child for a space, null before the first layout.
  final Widget Function(BuildContext context, Size? space) builder;

  @override
  RenderObjectElement createElement() => _SpaceBuilderElement(this);

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderSpaceBuilder();
}

class _SpaceBuilderElement extends RenderObjectElement {
  _SpaceBuilderElement(SpaceBuilder super.widget);

  @override
  _RenderSpaceBuilder get renderObject =>
      super.renderObject as _RenderSpaceBuilder;

  SpaceBuilder get _widget => widget as SpaceBuilder;

  Element? _child;

  /// The space the child was built for.
  Size? _builtFor;
  bool _built = false;

  /// The space of the last layout.
  Size? _laidOutIn;

  // As in LayoutBuilder, descendants rebuild in this element's scope, during
  // its render object's layout.
  @override
  BuildScope get buildScope => _buildScope;
  late final BuildScope _buildScope = BuildScope(
    scheduleRebuild: _scheduleRebuild,
  );

  bool _deferredCallbackScheduled = false;

  void _scheduleRebuild() {
    if (_deferredCallbackScheduled) return;
    switch (SchedulerBinding.instance.schedulerPhase) {
      case SchedulerPhase.idle || SchedulerPhase.postFrameCallbacks:
        _deferredCallbackScheduled = true;
        SchedulerBinding.instance.scheduleFrameCallback((Duration _) {
          _deferredCallbackScheduled = false;
          if (mounted) renderObject.scheduleLayoutCallback();
        });
      case SchedulerPhase.transientCallbacks ||
          SchedulerPhase.midFrameMicrotasks ||
          SchedulerPhase.persistentCallbacks:
        renderObject.scheduleLayoutCallback();
    }
  }

  @override
  void visitChildren(ElementVisitor visitor) {
    if (_child case final Element child) visitor(child);
  }

  @override
  void forgetChild(Element child) {
    assert(child == _child);
    _child = null;
    super.forgetChild(child);
  }

  @override
  void mount(Element? parent, Object? newSlot) {
    super.mount(parent, newSlot);
    renderObject.element = this;
    _build(null);
  }

  @override
  void update(SpaceBuilder newWidget) {
    super.update(newWidget);
    _build(_laidOutIn);
    renderObject.scheduleLayoutCallback();
  }

  @override
  void performRebuild() {
    super.performRebuild();
    _build(_laidOutIn);
    renderObject.scheduleLayoutCallback();
  }

  @override
  void unmount() {
    renderObject.element = null;
    super.unmount();
  }

  /// Builds the child for [space], in the build phase or a layout callback.
  void _build(Size? space) {
    _builtFor = space;
    _built = true;
    _child = updateChild(_child, _widget.builder(this, space), null);
  }

  /// Builds the child again when the space of this layout differs from the
  /// one it was built for, and rebuilds dirty descendants.
  void _layout(BoxConstraints constraints) {
    final Size window = _widget.window;
    final Size space = Size(
      constraints.hasBoundedWidth ? constraints.maxWidth : window.width,
      constraints.hasBoundedHeight ? constraints.maxHeight : window.height,
    );
    _laidOutIn = space;
    owner!.buildScope(
      this,
      _built && space == _builtFor ? null : () => _build(space),
    );
  }

  @override
  void insertRenderObjectChild(RenderBox child, Object? slot) {
    renderObject.child = child;
  }

  @override
  void moveRenderObjectChild(
    RenderObject child,
    Object? oldSlot,
    Object? newSlot,
  ) {
    assert(false);
  }

  @override
  void removeRenderObjectChild(RenderObject child, Object? slot) {
    assert(renderObject.child == child);
    renderObject.child = null;
  }
}

class _RenderSpaceBuilder extends RenderBox
    with
        RenderObjectWithChildMixin<RenderBox>,
        RenderObjectWithLayoutCallbackMixin {
  _SpaceBuilderElement? element;

  @override
  void layoutCallback() => element?._layout(constraints);

  @override
  double computeMinIntrinsicWidth(double height) =>
      child?.getMinIntrinsicWidth(height) ?? 0;

  @override
  double computeMaxIntrinsicWidth(double height) =>
      child?.getMaxIntrinsicWidth(height) ?? 0;

  @override
  double computeMinIntrinsicHeight(double width) =>
      child?.getMinIntrinsicHeight(width) ?? 0;

  @override
  double computeMaxIntrinsicHeight(double width) =>
      child?.getMaxIntrinsicHeight(width) ?? 0;

  @override
  Size computeDryLayout(BoxConstraints constraints) =>
      constraints.constrain(child?.getDryLayout(constraints) ?? Size.zero);

  @override
  double? computeDryBaseline(
    BoxConstraints constraints,
    TextBaseline baseline,
  ) => child?.getDryBaseline(constraints, baseline);

  @override
  void performLayout() {
    runLayoutCallback();
    if (child case final RenderBox child) {
      child.layout(constraints, parentUsesSize: true);
      size = constraints.constrain(child.size);
    } else {
      size = constraints.smallest;
    }
  }

  @override
  double? computeDistanceToActualBaseline(TextBaseline baseline) =>
      child?.getDistanceToActualBaseline(baseline) ??
      super.computeDistanceToActualBaseline(baseline);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      child?.hitTest(result, position: position) ?? false;

  @override
  void paint(PaintingContext context, Offset offset) {
    if (child case final RenderBox child) context.paintChild(child, offset);
  }
}
