---
codebase_path: packages/a2ui_craft
associated_module: craft_engine
module_blueprint_commit: null
implemented_features:
  craft_text_format: null
local_development:
  test_command: 'dart test'
  lint_command: 'dart analyze --fatal-infos'
  format_command: 'dart format .'
---

# **Dart Craft Engine Codebase Blueprint**

## **Architecture & Ecosystem Map**

The Dart implementation of the framework-independent part of the Craft engine (`a2ui_craft`). It has no UI-framework dependency; framework adapters build on it.

- **Library model and text format**: `lib/src/rfw/model.dart` and `lib/src/rfw/text.dart`, forked from RFW 2.0.0 (`third_party/rfw/`). They keep RFW's BSD license (`LICENSE` in this package); `tool/diff_rfw.sh` shows exactly what changed, ignoring formatting.
- **Canonical JSON form**: `lib/src/canonical_json.dart`, used by the conformance harness.
- **Conformance harness** (`dart-craft`): `test/conformance/conformance_harness.dart` loads each suite of `conformance/craft/`, runs every case with the handler of its `action` (handlers shared by several suites are in `parse_cases.dart`), fails a case with an unknown action or key, and writes an executed-case manifest when `A2UI_CONFORMANCE_MANIFEST_DIR` is set. `suite_registry.dart` names the test file of each suite.

## **Local Technical Decisions & Overrides**

- **Pinned commits**: `module_blueprint_commit` and the commits in `implemented_features` are filled in after the PR that adds them merges, because the repository squashes PRs and the final commit isn't known before (see "Blueprint commits" in the Craft README).

## **Validation & Execution Recipes**

- **Test execution**: `dart test` runs RFW's own tests, the unit tests and the shared conformance cases in `conformance/craft/`.
- **Static analysis**: `dart analyze --fatal-infos`.
- **Web compilation**: CI compiles a small program that imports the package with `dart compile js` and `dart compile wasm` (see `.github/workflows/presubmit-craft.yml`).
- **Formatting**: `dart format .`.
