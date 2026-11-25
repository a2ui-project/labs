# a2ui_craft_renderer_flutter

Craft templates as catalog components of the A2UI Flutter renderer
([`a2ui_flutter`](https://pub.dev/packages/a2ui_flutter)). `templateCatalog`
makes an A2UI catalog of the components a template library offers, with JSON
schemas derived from the templates; each component expands its template with
`CraftView` from `a2ui_craft_flutter`. Path-bound properties are two-way,
template events become A2UI actions, and child components are rendered by the
A2UI renderer.

What it implements is specified in [`craft/blueprints/`](../../blueprints/);
[`codebase.blueprint.md`](../../blueprints/codebases/dart/a2ui_craft_renderer_flutter/codebase.blueprint.md)
describes the package.

```sh
flutter test
dart analyze --fatal-infos
```
