# a2ui_craft

The framework-independent core of Craft: the template language, its data
model, its formats, and the runtime that expands templates into a tree of
primitive calls. It has no UI-framework dependency, so framework adapters can
build on it.

What it implements is specified in [`craft/blueprints/`](../../blueprints/);
[`codebase.blueprint.md`](../../blueprints/codebases/dart/a2ui_craft/codebase.blueprint.md)
lists the features.

```sh
dart test                    # unit tests and the shared conformance cases
dart analyze --fatal-infos
```

`lib/src/rfw/` and `test/rfw/` are forked from Remote Flutter Widgets 2.0.0
and keep its BSD license (see `LICENSE`). `craft/tool/diff_rfw.sh` shows how
they differ from the upstream copy in `craft/third_party/rfw/`, ignoring
formatting.
