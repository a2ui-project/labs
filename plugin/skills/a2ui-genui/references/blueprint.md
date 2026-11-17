# The blueprint

`a2ui.blueprint.json` at the app root is the plan of the conversion and its
state. It is the only memory that survives a new session. You write it, and
the user approves the flows.

## Format

<!-- prettier-ignore -->
```json
{
  "stack": "<stack id>",
  "sdk_versions": {"<agent SDK package>": "<version>", "<renderer package>": "<version>"},
  "flows": [
    {
      "id": "close_week", "placement": "inline", "kind": "act",
      "trigger": {"type": "prompt", "text": "Mark the entries of last week as done"},
      "expected_surface": ["EntryCard", "Button"],
      "test_command": "<one-flow command of the Flow test heading>",
      "status": "pending", "rounds_used": 0
    },
    {
      "id": "tag_selection", "placement": "sidebar", "kind": "input",
      "trigger": {"type": "context", "text": "Open the entry list and select two entries"},
      "expected_surface": ["EntryCard", "TextField"],
      "test_command": "<one-flow command of the Flow test heading>",
      "status": "pending", "rounds_used": 0
    },
    {
      "id": "today_overview", "placement": "home", "kind": "explore",
      "trigger": {"type": "context", "text": "Open the app"},
      "expected_surface": ["Card", "EntryCard"],
      "test_command": "<one-flow command of the Flow test heading>",
      "status": "pending", "rounds_used": 0
    }
  ]
}
```

- `id`: lowercase letters, digits and `_`. The test file names use it.
- `placement` and `kind`: see "Choose the flows".
- `trigger`: what starts the flow. With `type` `prompt`, `text` is what the
  user types. With `type` `context`, `text` is what the user does in the
  app. Opening the first screen is a `context` trigger. The date is an
  input of the request, not a trigger.
- `expected_surface`: the component names that must appear on the surface.
- `test_command`: one command that runs in the app root, where this file
  is. A path in it is relative to the app root.
- `status`: `pending`, `success` or `failed`. A `failed` flow also has
  `cause`, one sentence. `rounds_used`: the failed fix rounds, 0 to 5.

Do not change the trigger or the `expected_surface` of a flow to fit a
failed test or a recording. To change a flow, ask the user.

## Choose the flows

Propose exactly 3 flows, one for each placement where the app allows it.
Put an `inline` flow first: the core test runs in the placement of the
first flow, and its cases fit a conversation best. Start from the pairs of
this table:

| Placement | Shows in                                | Kind      | The surface                                                        |
| --------- | --------------------------------------- | --------- | ------------------------------------------------------------------ |
| `home`    | a region at the top of the first screen | `explore` | shows the data that matters on this date, with an app component    |
| `sidebar` | the side panel of the current screen    | `input`   | asks for data about the selection, with inputs and a submit button |
| `inline`  | a conversation                          | `act`     | shows a confirm surface, and the action handler does the write     |

`references/placements/<placement>.md` says which container of the app
qualifies. If the app has no container for a placement, take a second flow
of a placement that exists. If the app has nothing to act on, take a second
`explore` or `input` flow. Say why in the proposal.

To find the flows, list the app's screens and side panels, and the data
functions that read. These become the read tools. The functions that write
stay in the host. Pick the tasks that take the user several taps today.

## What makes a good flow

- It uses the app's real data through a read tool, not text that the model
  makes up.
- Its surface holds at least one app component from the catalog.
- A `prompt` trigger is one sentence that a user of this app types. A
  `context` trigger is at most three steps in the app's own screens.
- Its outcome can be checked: named components, text from the data, an
  action with known context. The checks use names and values that are the
  same in each run, not generated ids: a fixture keeps the ids of the run
  that recorded it.
- It needs no account, network service or data that a test cannot have.
- Its data is the same in each run. If the app's data depends on the date,
  the clock or random values, reuse the switches of the app's own
  end-to-end test config that make the data fixed, such as a fixed clock.
- It is short: one trigger, at most one action, at most one answer to it.
