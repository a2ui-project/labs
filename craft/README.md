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

Run `craft/blueprints/validate.py` to check the blueprints.

## License

Code in this directory is licensed under Apache 2.0, except
`third_party/rfw/` and the files forked from it (`lib/src/rfw/` and
`test/rfw/` in a package), which keep RFW's BSD license (see
`third_party/rfw/LICENSE`).
