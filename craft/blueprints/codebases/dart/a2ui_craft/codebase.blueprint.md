---
codebase_path: packages/a2ui_craft
associated_module: craft_engine
module_blueprint_commit: null
implemented_features:
  craft_text_format: null
  craft_libraries_and_names: null
  craft_binary_format: null
  craft_language_extensions: null
  craft_functions: null
  craft_template_registry: null
  craft_runtime: null
local_development:
  test_command: 'dart test'
  lint_command: 'dart analyze --fatal-infos'
  format_command: 'dart format .'
---

# **Dart Craft Engine Codebase Blueprint**

## **Architecture & Ecosystem Map**

The Dart implementation of the framework-independent part of the Craft engine (`a2ui_craft`). It has no UI-framework dependency; framework adapters build on it.

- **Library model and text format**: `lib/src/rfw/model.dart` and `lib/src/rfw/text.dart`, forked from RFW 2.0.0 (`third_party/rfw/`). They keep RFW's BSD license (`LICENSE` in this package); `tool/diff_rfw.sh` shows exactly what changed, ignoring formatting.
- **Language extensions**: also in `lib/src/rfw/text.dart`. The parser reads `absent`, `call`, `...if` and `let` straight into existing nodes (calls, loops and switches, and the bound values), so the model and the binary format are unchanged. `NameResolver` never resolves the names `absent` and `call` to a widget, and lists standard functions with those names only bare.
- **Binary format**: `lib/src/rfw/binary.dart`, forked from RFW 2.0.0 like the text format. It writes the Craft signatures, version header and declaration flags, decodes RFW blobs as version 0, skips extension values, and reports every decoding error as a `BlobFormatException` with a `BlobErrorKind` and a byte offset.
- **Name resolution**: `lib/src/name_resolution.dart`. `NameResolver` applies the `craft_libraries_and_names` rules over a live map of registered libraries (template libraries and `PrimitiveLibrary` implementations provided by framework adapters) and caches results until `invalidate`.
- **Functions**: `lib/src/functions.dart` defines a function (`LocalFunction`: parameters with a `FunctionArgType` and an implementation), the `FunctionRegistry` of standard and host functions, which checks host keys, and the value helpers the functions share (equality, exact number comparison, number display). `lib/src/standard_functions.dart` holds the standard functions. `lib/src/evaluator.dart` evaluates the values that need no runtime (literals, lists, maps, `absent`, args/data/state references, function calls), tells function calls from widget calls with `NameResolver`, and reports every failure as an `EvaluationException` with an `EvaluationErrorKind`.
- **Template registry**: `lib/src/template_registry.dart`. `TemplateRegistry` holds the registered template and primitive libraries (primitive libraries as a copy of their names and metadata) and the host functions, owns the `NameResolver` over them, builds each library's function table (standard functions, the introspection functions answering for that library, host functions), reads symbol references through the evaluator's `SymbolReader`, and computes the availability of libraries and components as a fixed point. Every registration drops the derived results. `lib/src/dependencies.dart` holds the declared dependencies (`LibraryDependencies`, `Requirement`) and the availability reports.
- **Runtime**: `lib/src/expansion.dart` defines the expansion: primitive, error and builder nodes, the handler nodes (`EventValue`, `SetStateValue`, `HandlerCallValue`, `HostHandler`), stateful instances, and the canonical JSON form. `lib/src/runtime.dart` holds `CraftRuntime`, which expands a root over a `TemplateRegistry`, keeps the state of its instances (reset when the registry's generation of the declaring library changes, so also when the same object is registered again; `TemplateRegistry.generation` counts each name's registrations and removals), expands builder outputs, fires handlers and notifies listeners. Evaluation happens in two phases: a node evaluates in a scope to a value or to a widget call not yet expanded (template arguments are evaluated on first read and kept), and placing that value at a path expands its widget calls, catching failures at the innermost widget. It calls functions through `checkCallArguments` and `invokeFunction`, shared with `lib/src/evaluator.dart`. The whole tree is expanded again after every change; there is no fine-grained invalidation.
- **Canonical JSON form**: `lib/src/canonical_json.dart`, used by the conformance harness.
- **Conformance harness** (`dart-craft`): `test/conformance/conformance_harness.dart` loads each suite of `conformance/craft/`, runs every case with the handler of its `action` (handlers shared by several suites are in `parse_cases.dart`, `resolution_cases.dart` and `runtime_engine.dart`), fails a case with an unknown action or key, and writes an executed-case manifest when `A2UI_CONFORMANCE_MANIFEST_DIR` is set. `suite_registry.dart` names the test file of each suite.

## **Local Technical Decisions & Overrides**

- **Deep nesting**: until the `craft_limits` feature lands, deeply nested input (for example a data blob of about 90 KB holding 10,000 nested lists, or an equally deep source or expression) overflows the stack in the text parser, the binary decoder and the evaluator.
- **Integers on the web**: compiled with dart2js, integers are JavaScript numbers, exact only up to 2^53 in magnitude, and an integral double is an integer, so the exact integer rules of `craft_functions` do not hold there. In particular, the 64-bit range rule for `add`, `subtract` and `multiply` applies to the exact result of arguments that may already be rounded, and a result in range is rounded to the nearest double. Compiled with dart2wasm, integers are 64-bit, as on the VM.
- **Pinned commits**: `module_blueprint_commit` and the commits in `implemented_features` are filled in after the PR that adds them merges, because the repository squashes PRs and the final commit isn't known before (see "Blueprint commits" in the Craft README).

## **Validation & Execution Recipes**

- **Test execution**: `dart test` runs RFW's own tests, the unit tests and the shared conformance cases in `conformance/craft/`.
- **Static analysis**: `dart analyze --fatal-infos`.
- **Web compilation**: CI compiles a small program that imports the package with `dart compile js` and `dart compile wasm` (see `.github/workflows/presubmit-craft.yml`).
- **Formatting**: `dart format .`.
