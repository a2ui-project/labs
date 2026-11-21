---
codebase_path: packages/a2ui_craft_flutter
associated_module: craft_engine
module_blueprint_commit: null
implemented_features: {}
local_development:
  test_command: 'flutter test'
  lint_command: 'dart analyze --fatal-infos'
  format_command: 'dart format .'
---

# **Flutter Craft Adapter Codebase Blueprint**

## **Architecture & Ecosystem Map**

The Flutter adapter of the Craft engine (`a2ui_craft_flutter`). The `runtime` feature is implemented by `a2ui_craft` (`CraftRuntime`), which produces the expansion; this package only renders it with Flutter widgets, so it claims no feature of its own. Building blocks are not part of it: a host supplies its primitives as Flutter widgets.

- **Primitives**: `lib/src/primitive_widgets.dart`. A `PrimitiveWidgetLibrary` maps primitive names to `PrimitiveWidget`s (a builder and the metadata templates read). It is a `PrimitiveLibrary`, so the host registers the same object in the `TemplateRegistry` and gives it to `CraftView`. A builder reads its node through `PrimitiveArguments`: values, `child` and `children` (widget, host widget and error nodes; other elements, such as absent ones, are no child), `handler` and `valueHandler` (null when the handler is not runnable, so the control can be disabled; a value handler fires with `{value: v}`), and `builder` (expands a builder's output for a key and an argument).
- **View**: `lib/src/craft_view.dart`. `CraftView` renders the current expansion of a `CraftRuntime` and expands it again when the runtime notifies a change; changes notified while a frame is being built are rendered by one expansion after that frame, so no rebuild is requested during a build. It stops listening when it is disposed. Firing goes to the runtime; the events it gives go to `onEvent`. Expansion errors (of the root and of builder outputs), firing errors and primitives without a widget (`MissingPrimitiveWidget`) go to `onError` after the frame that renders them, unless the view is gone by then; an error found while rendering is reported once per expansion of the root, however often it is rebuilt; and error nodes render as a small `ErrorWidget` unless `errorBuilder` says otherwise. Host widget nodes render what `hostWidgetBuilder` builds for them, or nothing without it.
- **Media context**: also in `lib/src/craft_view.dart`. `CraftView.media` (a `MediaSource`) says where the runtime's media context comes from: `layout` (the default) measures the maximum size of the view's layout constraints with a `LayoutBuilder`, taking the `MediaQuery` size for an unbounded axis; `window` takes the `MediaQuery` size; `host` leaves the media context to the host. In the first two the view sets the media context with `MediaContext.fromSize`, the platform from `defaultTargetPlatform` (`web` on the web) and `reducedMotion` from `MediaQuery.disableAnimations`, before it expands, so the first frame and the frame of a resize across a class render the new classes, with one expansion each; a resize within the same classes expands nothing. It sets the media context without notifying (`CraftRuntime.setMedia(notify: false)`), because that happens during build or layout, where a listening host must not rebuild, and calls `refresh` after the frame so that the runtime's other listeners hear of it; it ignores that notification itself.

## **Local Technical Decisions & Overrides**

- **Whole-tree rendering**: every change renders the whole expansion again and leaves the diffing to Flutter; there is no per-node subscription as in RFW.
- **Media from the layout by default**: a template is often placed in part of the screen (an A2UI component in a row, a pane), and adapts to the space it actually gets. The cost is that of every `LayoutBuilder`: the view cannot answer intrinsic size queries in `layout` mode, which is why `window` and `host` exist. Two views that set the media context of one runtime from different sizes would keep replacing each other's; a runtime is shown by one such view.
- **State lives in the runtime**: template state belongs to `CraftRuntime` instances keyed by path, not to Flutter `State` objects, so the same expansion renders identically in any adapter.

## **Validation & Execution Recipes**

- **Test execution**: `flutter test` runs widget tests with a small test-only primitive library (column, row, text, button, field and list widgets), checking that the view renders the expansion and host widgets, fires handlers, forwards events and errors, follows data updates and state, builds builder outputs, never rebuilds during a build, expands once for several changes during a build, stops listening when disposed, reports nothing once gone, and reports a rendering error once per expansion; and that each media source sets the media context (sizes, an unbounded axis, platform and reduced motion), renders a resize across a class in the same frame with one expansion, expands nothing for a resize within a class, reports no error from an expansion without a media context, notifies a listening host that rebuilds only after the frame, and answers intrinsic size queries in `window` and `host` modes.
- **Static analysis**: `dart analyze --fatal-infos`.
- **Formatting**: `dart format .`.
