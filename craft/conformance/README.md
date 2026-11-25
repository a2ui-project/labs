# Craft Conformance Testing

The language-agnostic conformance suite of the Craft engine. Every engine
implementation runs these cases, so that a template means the same thing on
each of them. The suite follows the conventions of A2UI's conformance suite
(`conformance/` in the A2UI repository) and is laid out as it will be there.

## Suite Structure

`craft/` holds one suite per feature blueprint, named after the feature:
`craft/<feature>.yaml` covers `blueprints/features/<feature>.blueprint.md`.

| Suite                                  | Actions                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| `craft/craft_text_format.yaml`         | `parse_library`, `parse_data`                                    |
| `craft/craft_libraries_and_names.yaml` | `parse_library`, `resolve_names`                                 |
| `craft/craft_binary_format.yaml`       | `decode_library`, `decode_data`, `encode_library`, `encode_data` |
| `craft/craft_language_extensions.yaml` | `parse_library`, `parse_data`, `resolve_names`                   |
| `craft/craft_functions.yaml`           | `evaluate`, `classify`                                           |
| `craft/craft_template_registry.yaml`   | `update_registry`                                                |
| `craft/craft_runtime.yaml`             | `expand_template`                                                |
| `craft/craft_a2ui_integration.yaml`    | `derive_catalog_schema`, `map_props`                             |
| `craft/craft_media_context.yaml`       | `media_map`, `media_sizes`, `evaluate_media`, `expand_template`  |

Each suite's header describes its actions and the inputs and expectations
they take. Every case has a `name`, a `description`, an `action` and the
`features` it exercises. An action means the same in every suite that uses it.

- `conformance_schema.json` is the JSON schema of the suites: one definition
  per action, each closed to keys it does not define.
- `features.yaml` (validated by `features.schema.json`) lists the feature
  IDs: `F-CRAFT-<AREA>-<n>` is requirement `n` of one feature blueprint, and
  its `blueprintAnchor` points at that requirement. Every case tags the
  requirement it tests.
- `manifest_corpora.json` names the corpus (`craft`) that a harness's
  executed-case manifest is checked against.
- `tests/test_conformance_yaml.py` validates every suite against the schema.

Paths in suites, the registry and the blueprints are relative to `craft/`,
which becomes the A2UI repository root when Craft moves there.

## Usage in SDKs

A harness reads the suites, runs each case with the handler of its `action`,
and checks the expectations. It follows A2UI's
[harness guide](https://github.com/a2ui-project/a2ui/blob/main/conformance/conformance_harness_implementation_guide.md):
an unknown action or key fails the case, and when
`A2UI_CONFORMANCE_MANIFEST_DIR` is set it writes an executed-case manifest.

The Dart harness, `dart-craft`, is in
`packages/a2ui_craft/test/conformance/`. It locates `conformance/` by walking
up from the package, so it needs no configured path.

## Checks

From the repository root, with the A2UI submodule checked out (CI runs them
in `Presubmit Craft`):

```sh
A2UI=third_party/a2ui/conformance
MANIFEST=$(mktemp -d)
uv run --project $A2UI python -m pytest craft/conformance/tests
uv run --project $A2UI python $A2UI/scripts/check_feature_coverage.py --static \
  --registry craft/conformance/features.yaml --corpus-dir craft/conformance --repo-root craft
(cd craft/packages/a2ui_craft &&
  A2UI_CONFORMANCE_MANIFEST_DIR=$MANIFEST dart test test/conformance)
uv run --project $A2UI python $A2UI/scripts/check_executed_cases.py \
  --manifest-dir $MANIFEST --harness dart-craft --corpus craft --conformance-root craft/conformance
uv run --project $A2UI python $A2UI/scripts/check_feature_coverage.py \
  --registry craft/conformance/features.yaml --corpus-dir craft/conformance --repo-root craft \
  --manifest-dir $MANIFEST --harness dart-craft
```

The coverage and executed-case checks are A2UI's own scripts, pointed at
Craft's registry and corpus.
