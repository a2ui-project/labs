# a2ui_craft_flutter

The Flutter adapter of Craft. The runtime in `a2ui_craft` expands a template
into a tree of primitive calls; `CraftView` renders that tree with the Flutter
widgets of a `PrimitiveWidgetLibrary`, fires the handlers its primitives
call, and forwards the events to the host.

What it implements is specified in [`craft/blueprints/`](../../blueprints/);
[`codebase.blueprint.md`](../../blueprints/codebases/dart/a2ui_craft_flutter/codebase.blueprint.md)
describes the package.

```sh
flutter test
dart analyze --fatal-infos
```
