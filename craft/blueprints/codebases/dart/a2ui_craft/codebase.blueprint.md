---
codebase_path: packages/a2ui_craft
associated_module: craft_engine
module_blueprint_commit: null
implemented_features:
  craft_text_format: null
  craft_libraries_and_names: null
  craft_binary_format: null
  craft_language_extensions: null
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
- **Canonical JSON form**: `lib/src/canonical_json.dart`, used by the conformance harness.
- **Conformance harness** (`dart-craft`): `test/conformance/conformance_harness.dart` loads each suite of `conformance/craft/`, runs every case with the handler of its `action` (handlers shared by several suites are in `parse_cases.dart` and `resolution_cases.dart`), fails a case with an unknown action or key, and writes an executed-case manifest when `A2UI_CONFORMANCE_MANIFEST_DIR` is set. `suite_registry.dart` names the test file of each suite.

## **Local Technical Decisions & Overrides**

- **Pinned commits**: `module_blueprint_commit` and the commits in `implemented_features` are filled in after the PR that adds them merges, because the repository squashes PRs and the final commit isn't known before (see "Blueprint commits" in the Craft README).

## **Validation & Execution Recipes**

- **Test execution**: `dart test` runs RFW's own tests, the unit tests and the shared conformance cases in `conformance/craft/`.
- **Static analysis**: `dart analyze --fatal-infos`.
- **Web compilation**: CI compiles a small program that imports the package with `dart compile js` and `dart compile wasm` (see `.github/workflows/presubmit-craft.yml`).
- **Formatting**: `dart format .`.
