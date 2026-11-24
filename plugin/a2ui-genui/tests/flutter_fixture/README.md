# Flutter fixture

A small Flutter app of the kind that the `a2ui-genui` skill makes, with one
flow for each placement. Its tests prove the rules of
`../../skills/a2ui-genui/references/stacks/flutter.md` on the pub.dev
versions in `pubspec.yaml`. The skill does not install it. No test calls a
model.

```bash
flutter pub get
flutter analyze
flutter test
```

The session and the model client start from the example of the
`a2ui_flutter` 0.2.0 package. The fake client is in `test/`, and nothing
under `lib/` names it.

| Test                      | Subject                                                      |
| ------------------------- | ------------------------------------------------------------ |
| `recorded_turn_test.dart` | The conversation: surface, action, read tool, rejected block |
| `standing_test.dart`      | The side panel and the home region                           |
| `host_action_test.dart`   | One press, one write. Held replies. The busy state.          |
| `recording_test.dart`     | A failed turn gives no recording                             |
| `llm_client_test.dart`    | The stream timeout                                           |
| `sdk_traps_test.dart`     | SDK behavior that the stack file warns about                 |

The recording in `test/fixtures/` is written by hand, not recorded from a
live model.
