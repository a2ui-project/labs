---
codebase_path: packages/a2ui_craft
associated_module: craft_engine
module_blueprint_commit: null
implemented_features:
  text_format: null
  libraries_and_names: null
  binary_format: null
  language_extensions: null
  functions: null
  template_registry: null
  runtime: null
  a2ui_integration: null
  media_context: null
  limits: null
local_development:
  test_command: 'dart test'
  lint_command: 'dart analyze --fatal-infos'
  format_command: 'dart format .'
---

# **Dart Craft Engine Codebase Blueprint**

## **Architecture & Ecosystem Map**

The Dart implementation of the framework-independent part of the Craft engine (`a2ui_craft`). It has no UI-framework dependency; framework adapters build on it.

- **Library model and text format**: `lib/src/rfw/model.dart` and `lib/src/rfw/text.dart`, forked from RFW 2.0.0 (`craft/third_party/rfw/`). They keep RFW's BSD license (`LICENSE` in this package); `craft/tool/diff_rfw.sh` shows exactly what changed, ignoring formatting.
- **Language extensions**: also in `lib/src/rfw/text.dart`. The parser reads `absent`, `call`, `...if` and `let` straight into existing nodes (calls, loops and switches, and the bound values), so the model and the binary format are unchanged. `NameResolver` never resolves the names `absent` and `call` to a widget, and lists standard functions with those names only bare.
- **Binary format**: `lib/src/rfw/binary.dart`, forked from RFW 2.0.0 like the text format. It writes the Craft signatures, version header and declaration flags, decodes RFW blobs as version 0, skips extension values, and reports every decoding error as a `BlobFormatException` with a `BlobErrorKind` and a byte offset.
- **Name resolution**: `lib/src/name_resolution.dart`. `NameResolver` applies the `libraries_and_names` rules over a live map of registered libraries (template libraries and `PrimitiveLibrary` implementations provided by framework adapters) and caches results until `invalidate`.
- **Functions**: `lib/src/functions.dart` defines a function (`LocalFunction`: parameters with a `FunctionArgType` and an implementation), the `FunctionRegistry` of standard and host functions, which checks host keys, and the value helpers the functions share (equality, exact number comparison, number display). `lib/src/standard_functions.dart` holds the standard functions. `lib/src/evaluator.dart` evaluates the values that need no runtime (literals, lists, maps, `absent`, args/data/state references, function calls), tells function calls from widget calls with `NameResolver`, and reports every failure as an `EvaluationException` with an `EvaluationErrorKind`.
- **Template registry**: `lib/src/template_registry.dart`. `TemplateRegistry` holds the registered template and primitive libraries (primitive libraries as a copy of their names and metadata) and the host functions, owns the `NameResolver` over them, builds each library's function table (standard functions, the introspection functions answering for that library, host functions), reads symbol references through the evaluator's `SymbolReader`, and computes the availability of libraries and components as a fixed point. Every registration drops the derived results. `lib/src/dependencies.dart` holds the declared dependencies (`LibraryDependencies`, `Requirement`) and the availability reports.
- **Runtime**: `lib/src/expansion.dart` defines the expansion: primitive, error and builder nodes, the handler nodes (`EventValue`, `SetStateValue`, `HandlerCallValue`, `HostHandler`), stateful instances, and the canonical JSON form. `lib/src/runtime.dart` holds `CraftRuntime`, which expands a root over a `TemplateRegistry`, keeps the state of its instances (reset when the registry's generation of the declaring library changes, so also when the same object is registered again; `TemplateRegistry.generation` counts each name's registrations and removals), expands builder outputs, fires handlers and notifies listeners. Evaluation happens in two phases: a node evaluates in a scope to a value or to a widget call not yet expanded (template arguments are evaluated on first read and kept), and placing that value at a path expands its widget calls, catching failures at the innermost widget. It calls functions through `checkCallArguments` and `invokeFunction`, shared with `lib/src/evaluator.dart`. The whole tree is expanded again after every change; there is no fine-grained invalidation.
- **A2UI integration**: the framework-independent part of `a2ui_integration` (requirements 1 to 6; requirement 7, rendering, is implemented for Flutter by `a2ui_craft_renderer_flutter`). `lib/src/a2ui_catalog.dart` derives each offered component's `TemplateInterface` (its properties with their `ArgKind`, and whether it is checkable) by walking its declaration's root with the kind of each position, following template calls with a per-declaration cache that skips results computed through a call back into a declaration under analysis, and writes the A2UI v1.0 component schema (`templateCatalogSchemas`). `lib/src/a2ui_props.dart` maps resolved props, described with `A2uiProp` (each holding the renderer's own object, which this package never looks into), to `TemplateArgs`: the arguments with their host handlers and host widgets, and the `A2uiEffect`s of each event that firing gives. `TemplateRegistry.primitiveMeta` gives the analysis the metadata of a primitive. The runtime carries host widgets (`HostWidget`, placed as `HostWidgetNode`s) for the renderer's child nodes.
- **Media context**: `lib/src/media_context.dart` defines `MediaContext` (made from its properties or with `MediaContext.fromSize`, whose breakpoints are in `WidthClass.of` and `HeightClass.of`), `SurfaceOrientation` and `HostPlatform`, the media map (`toMap`), `readMedia`, which both the evaluator and the runtime use for media references, and `mediaFunctions` (`atLeast`), which `TemplateRegistry.functionsFor` adds to every function table next to the standard and introspection functions. `Evaluator.evaluate` and `TemplateRegistry.evaluate` take a media context; `CraftRuntime.media` holds the runtime's; its setter notifies only when the new one is not equal, and `setMedia(notify: false)` replaces it without notifying, for a host that calls `refresh` later.
- **Limits**: `lib/src/limits.dart` defines `CraftLimits` (the six limits, their defaults and JSON form), `CraftLimitException`, `checkLibraryLimits` (the declaration measures, which `TemplateRegistry.setTemplateLibrary` applies) and `limitedValue` (the conversion of host values and function results with the depth and string checks, which fails at a `BeyondLimits` marker; `TemplateArgs.from` puts one in place of a prop value beyond the limits). The parser (`lib/src/rfw/text.dart`) counts the depth and nodes of the library it builds as it reads, keeping each `let` binding's depth and node count to add them at each use, and reports a `ParserException` with a `limit`; the decoder (`lib/src/rfw/binary.dart`) counts tagged values and reports `BlobErrorKind.limitExceeded`. The evaluator and the runtime count the depth of the node being evaluated; the runtime's pass also counts steps and nodes, throws a private stop exception past either budget (never cached by a template argument), and gives back the instances it had before the pass.
- **Canonical JSON form**: `lib/src/canonical_json.dart`, used by the conformance runners in `test/conformance/`. The runner of runtime cases (`runtime_engine.dart`) is shared by `runtime.yaml` and the runtime cases of `media_context.yaml`.

## **Local Technical Decisions & Overrides**

- **Depth ceiling**: `CraftLimits` refuses a `maxDepth` above 1,000 (`CraftLimits.maxDepthCeiling`). At 2,000 a chain of templates overflowed the stack of a desktop VM; the default, 100, leaves a margin for smaller stacks.
- **Encoders are not limited**: `encodeLibraryBlob` and `encodeDataBlob` write what the host gives them, so a library or value that the host builds deeper than the stack allows overflows there; everything the parser, decoders and registry accept encodes.
- **Pinned commits**: `module_blueprint_commit` and the commits in `implemented_features` are filled in after the PR that adds them merges, because the repository squashes PRs and the final commit isn't known before.

## **Validation & Execution Recipes**

- **Test execution**: `dart test` runs RFW's own tests and the shared conformance cases in `craft/conformance/`.
- **Static analysis**: `dart analyze --fatal-infos`.
- **Formatting**: `dart format .`.
