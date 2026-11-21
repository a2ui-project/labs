---
codebase_path: packages/a2ui_craft_renderer_flutter
associated_module: craft_engine
module_blueprint_commit: null
implemented_features: {}
local_development:
  test_command: 'flutter test'
  lint_command: 'dart analyze --fatal-infos'
  format_command: 'dart format .'
---

# **Flutter A2UI Template Catalog Codebase Blueprint**

## **Architecture & Ecosystem Map**

Craft templates as catalog components of the A2UI Flutter renderer (`a2ui_craft_renderer_flutter`). It depends on the published `a2ui_core` and `a2ui_flutter` packages, uses only their public API, and changes neither. `a2ui_craft` claims the `craft_a2ui_integration` feature and implements its framework-independent parts (schemas, props to arguments, effects); this package implements requirement 7, rendering on top of them with `a2ui_craft_flutter`, so like that adapter it claims no feature of its own.

- **Catalog**: `lib/src/template_catalog.dart`. `templateCatalog` makes a v1.0 `CatalogImplementation` with one `ComponentImplementation` per offered component of a template library, its schema from `TemplateInterface.schema`, and the functions the host passes (for dynamic values and `@checks` on these components). Each node renders a stateful widget that keeps one `CraftRuntime` while the node lives and renders it with `CraftView`. On every rebuild it converts the node's props (`WritableBinding`, `ResolvedBinding`, `NodeAction`, child nodes, check results) into `A2uiProp`s, maps them to `TemplateArgs`, and replaces the runtime's arguments when their canonical form changed. Host widget nodes render the child node they stand for through the renderer's child builder. Effects go to `SurfaceModel.dispatchAction` from the node's component id, to the `NodeAction` invoked synchronously, or to `WritableBinding.set`. Errors go to `onError` with the component id.

## **Local Technical Decisions & Overrides**

- **Published A2UI packages**: `a2ui_core` ^0.8.0 and `a2ui_flutter` ^0.4.0 from pub.dev, the versions in the A2UI repository, rather than a path into `third_party/a2ui`. They need Dart 3.10 and Flutter 3.38, so this package requires those minimums (`sdk: ^3.10.0`, `flutter: ">=3.38.0"`), higher than the other Craft packages.
- **One frame for property updates**: new arguments notify the runtime during a build, so `CraftView` renders them after that frame.
- **v1.0 only**: schemas use the v1.0 common types, so the catalog declares protocol version 1.0.

## **Validation & Execution Recipes**

- **Test execution**: `flutter test` runs widget tests that drive an A2UI surface with v1.0 messages through a `MessageProcessor` with strict validation, over the template catalog and the basic catalog, with test-only primitives.
- **Static analysis**: `dart analyze --fatal-infos`.
- **Formatting**: `dart format .`.
