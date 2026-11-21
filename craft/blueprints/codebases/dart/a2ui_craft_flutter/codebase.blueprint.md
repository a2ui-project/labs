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

- **Primitives**: `lib/src/primitive_widgets.dart`. A `PrimitiveWidgetLibrary` maps primitive names to `PrimitiveWidget`s (a builder and the metadata templates read). It is a `PrimitiveLibrary`, so the host registers the same object in the `TemplateRegistry` and gives it to `CraftView`. A builder reads its node through `PrimitiveArguments`: values, `child` and `children` (widget and error nodes; other elements, such as absent ones, are no child), `handler` and `valueHandler` (null when the handler is not runnable, so the control can be disabled; a value handler fires with `{value: v}`), and `builder` (expands a builder's output for a key and an argument).
- **View**: `lib/src/craft_view.dart`. `CraftView` renders the current expansion of a `CraftRuntime` and expands it again when the runtime notifies a change; changes notified while a frame is being built are rendered by one expansion after that frame, so no rebuild is requested during a build. It stops listening when it is disposed. Firing goes to the runtime; the events it gives go to `onEvent`. Expansion errors (of the root and of builder outputs), firing errors and primitives without a widget (`MissingPrimitiveWidget`) go to `onError` after the frame that renders them, unless the view is gone by then; an error found while rendering is reported once per expansion of the root, however often it is rebuilt; and error nodes render as a small `ErrorWidget` unless `errorBuilder` says otherwise.

## **Local Technical Decisions & Overrides**

- **Whole-tree rendering**: every change renders the whole expansion again and leaves the diffing to Flutter; there is no per-node subscription as in RFW.
- **State lives in the runtime**: template state belongs to `CraftRuntime` instances keyed by path, not to Flutter `State` objects, so the same expansion renders identically in any adapter.

## **Validation & Execution Recipes**

- **Test execution**: `flutter test` runs widget tests with a small test-only primitive library (column, row, text, button, field and list widgets), checking that the view renders the expansion, fires handlers, forwards events and errors, follows data updates and state, builds builder outputs, never rebuilds during a build, expands once for several changes during a build, stops listening when disposed, reports nothing once gone, and reports a rendering error once per expansion.
- **Static analysis**: `dart analyze --fatal-infos`.
- **Formatting**: `dart format .`.
