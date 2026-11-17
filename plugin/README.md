# a2ui-genui

An agent skill that adds A2UI generative UI to an existing React or Flutter
app. The coding agent proposes three flows from your app, one for each
placement:

| Placement | Where the generated UI shows                                    |
| --------- | --------------------------------------------------------------- |
| `inline`  | In a conversation, as the answer to a prompt                    |
| `sidebar` | In a panel that follows what the user selects on a screen       |
| `home`    | In a region of the start screen, made at app start and each day |

For what A2UI is, use the `a2ui` skill: `npx skills add a2ui-project/a2ui`.

## Supported stacks

| Stack   | Found by                              | SDKs that the skill uses                                                         | Tested with                       |
| ------- | ------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------- |
| React   | `package.json` with `react`           | `@a2ui/agent`, `@a2ui/web_core`, `@a2ui/react`, `@google/genai`                  | 0.1.0, 0.15.0, 0.15.0, 3.0.0      |
| Flutter | `pubspec.yaml` with the `flutter` SDK | `a2ui_flutter`, `a2ui_core`, `a2ui_agent`, `json_schema_builder`, `dartantic_ai` | 0.2.0, 0.6.0, 0.2.0, 0.1.7, 3.4.2 |

The skill keeps the SDK versions that the app has, and installs the current
versions of the missing ones. On a different stack, it stops.

## Install

Claude Code:

```text
/plugin marketplace add a2ui-project/labs
/plugin install a2ui-genui@a2ui-labs
```

Other agents, in the app repository:

```bash
npx skills add a2ui-project/labs --skill a2ui-genui
```

The install lines are not yet tested against the published repository.
Only Claude Code and Codex ran the skill so far.

## Use

Commit your changes first, because the skill stops on a dirty working tree.
Then send this prompt:

```text
Add A2UI generative UI to this app.
```

The agent asks for a yes at three points: the plan, the three flows, and the
live check. For the live check, you type your Gemini API key into the app,
not into the conversation.

## What you get

- The three flows in your app, with a catalog that uses the app's own
  components, and a key entry in the app's settings.
- One test for each flow. The tests replay recorded model replies, so they
  need no key and no network.
- `a2ui.blueprint.json` at the app root: the flows and their state.
- A summary: the flows that work, the SDK versions, the changed files and
  the SDK gaps.

## Rules

- The skill is text only. The agent writes all code in your app, on the
  official A2UI SDKs. It does not write A2UI messages by hand.
- The Gemini key stays on the device. It is never in a tracked file, a
  fixture, a log or a command line.
- The model gets read tools only. A write runs in the app, after the user
  presses a button.
- A flow passes when its test passes three runs in a row. The agent fixes a
  flow for at most five rounds.

## Development

With Node 22 or later, in this folder:

```bash
npm test
```

- `evals/` grades the skill on sample apps. See `evals/README.md`.
- `tests/react-fixture/` and `tests/flutter_fixture/` prove the rules of the
  stack files on the tested SDK versions. Each has a README.

## License

Apache 2.0.
