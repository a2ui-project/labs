# Craft

Craft is an experimental client-side template system for A2UI.

Developers write reusable UI components ahead of time in Craft, a small
declarative language. At runtime an agent invokes a template like any other
catalog component, with regular A2UI messages, and the app renders it natively.
Templates can't run arbitrary code: they compose a small set of native building
blocks, keep local UI state, and send actions back to the app.

Craft's language and binary format started as a fork of
[Remote Flutter Widgets](https://pub.dev/packages/rfw) (RFW).

## Status

Experimental. The language, formats and APIs will change. Flutter comes first;
web follows.

## Layout

This directory is being populated in a series of pull requests:

| Path               | Contents                                                                         |
| ------------------ | -------------------------------------------------------------------------------- |
| `blueprints/`      | What the engine must do, one blueprint per feature, in A2UI's blueprint format   |
| `conformance/`     | Shared test cases for each feature, which every engine implementation must pass  |
| `packages/`        | The Craft engine, building blocks, Flutter adapter and A2UI integration          |
| `third_party/rfw/` | Remote Flutter Widgets 2.0.0, unmodified, as the starting point                  |
| `tool/`            | Scripts, such as `diff_rfw.sh`, which shows how the engine's fork of RFW differs |

Run `craft/blueprints/validate.py` to check the blueprints, and see
[`conformance/README.md`](conformance/README.md) for the checks of the
conformance suites.

## Moving to the A2UI repository

Craft is meant to move into the [A2UI repository](https://github.com/a2ui-project/a2ui).
`blueprints/` and `conformance/` already follow A2UI's conventions and are laid
out as they will be there, so the move is mechanical:

| Here                                           | In the A2UI repository                                                |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `blueprints/features/craft_*.blueprint.md`     | `blueprints/features/`                                                |
| `blueprints/modules/craft_engine.blueprint.md` | `blueprints/modules/`                                                 |
| `blueprints/codebases/dart/a2ui_craft*/`       | `blueprints/codebases/dart/`, with `codebase_path` `dart/a2ui_craft*` |
| `conformance/craft/*.yaml`                     | `conformance/craft/`                                                  |
| `conformance/conformance_schema.json`          | its `Craft*` definitions merged into A2UI's `conformance_schema.json` |
| `conformance/features.yaml`                    | appended to A2UI's `features.yaml`                                    |
| `conformance/features.schema.json`             | its ID pattern and harnesses merged into A2UI's                       |
| `conformance/manifest_corpora.json`            | its `craft` corpus added to A2UI's                                    |
| `conformance/tests/test_conformance_yaml.py`   | merged into A2UI's `conformance/tests/test_conformance_yaml.py`       |
| `packages/a2ui_craft*/`                        | `dart/a2ui_craft*/`                                                   |

Feature names carry a `craft_` prefix and feature IDs an `F-CRAFT-` prefix, so
that they can't collide with A2UI's. Paths in blueprints, suites and the
feature registry are relative to `craft/`, which becomes the repository root.

## Blueprint commits

A codebase blueprint pins the commit of the module blueprint
(`module_blueprint_commit`) and of each feature blueprint it implements
(`implemented_features`), as A2UI's blueprint compliance check expects. This
repository squash-merges pull requests, so a commit is known only once its
pull request has merged: the pins stay `null` until then, and a follow-up pull
request sets each one to the last commit on `main` that changed the blueprint
(`git log -n 1 --format=%H -- craft/blueprints/features/<feature>.blueprint.md`).
A later change to a blueprint updates the pins of the codebases that follow it
in a pull request of its own, after it merges. The history doesn't move with
Craft, so the move to the A2UI repository pins the commit that adds Craft
there.

## License

Code in this directory is licensed under Apache 2.0, except
`third_party/rfw/` and the files forked from it (`lib/src/rfw/` and
`test/rfw/` in a package), which keep RFW's BSD license (see
`third_party/rfw/LICENSE`).
