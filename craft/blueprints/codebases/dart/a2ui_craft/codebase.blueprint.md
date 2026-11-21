---
codebase_path: packages/a2ui_craft
associated_module: craft_engine
module_blueprint_commit: null
implemented_features:
  text_format: null
  libraries_and_names: null
  binary_format: null
  language_extensions: null
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
- **Canonical JSON form**: `lib/src/canonical_json.dart`, used by the conformance runner in `test/conformance/`.

## **Local Technical Decisions & Overrides**

- **Pinned commits**: `module_blueprint_commit` and the commits in `implemented_features` are filled in after the PR that adds them merges, because the repository squashes PRs and the final commit isn't known before.

## **Validation & Execution Recipes**

- **Test execution**: `dart test` runs RFW's own tests and the shared conformance cases in `craft/conformance/`.
- **Static analysis**: `dart analyze --fatal-infos`.
- **Formatting**: `dart format .`.
