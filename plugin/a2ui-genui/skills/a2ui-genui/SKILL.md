---
name: a2ui-genui
description: Add A2UI generative UI to an existing app. Use when the user asks to "add generative UI to this app", "add A2UI to my app" or "make this app agentic with A2UI". It detects the app's stack, proposes three flows from the app's own screens and data, each with a placement (in a conversation, in a side panel, or on the home screen), wires the official A2UI SDKs and a Gemini model client with the user's own key, and leaves a test for each flow that replays a recorded model reply. It does not explain what A2UI is or when to use it. The a2ui skill covers that.
license: Apache-2.0
compatibility: Needs git and the toolchain of the app's stack. Tests need no network and no key.
metadata:
  version: '0.1.0'
---

# Add A2UI generative UI to an app

You add generated UI to the user's app, in containers that the app already
has. The surfaces use the app's own components and data. You build three
flows, and a test proves each one.

Each step names the reference or the stack file heading to read. Read it at
that step, not before.

## Guardrails

- Use the official SDKs only: the A2UI agent SDK, the A2UI renderer and core
  packages of the stack, and the model client package that the stack file
  names. Do not fork or patch an SDK. Write an SDK gap as a draft issue for
  your last message.
- Do not write protocol code by hand when an SDK call exists: no
  hand-built A2UI messages, no own parser, no own validator.
- Do not write A2UI code from memory: your training data holds older
  protocol versions. Write it from the installed SDK: its README, its
  types, and the example that the stack file names. Where the installed
  SDK and a stack file differ, the installed SDK is right.
- Put no test code in the app's source: no fake client, no test flag and no
  branch that runs only in a test. A flow test replaces the model from
  outside the app. An accessible name, a stable attribute or a constructor
  parameter that a test also uses is not test code.
- Format the files you add with the app's own formatter and linter. Do
  not disable a rule, and do not reformat other files.
- The model gets read tools only. A write runs in the app's action handler,
  after the user presses a button on a surface: a confirm button, or the
  submit button of a form.
- Keep the user's key on the device. Never put it in a tracked file, a
  fixture, a log, a command line or your output, and never ask the user to
  paste it into the conversation. Give it to a command only through an
  environment variable. A flow test never calls a model.
- A flow passes when its test passes, not when you think that it works. Do
  not weaken a test to make it pass: do not remove an assertion, skip a
  test, or edit a recorded fixture.
- Run builds, tests and recordings in the foreground, and wait for each to
  end. Do not end your turn while one of them runs in the background.
- Build the in-process setup: the agent SDK and the model client run in
  the app, with each user's own key. If the app has its own backend with a
  shared key, tell the user, and do not build that branch.
- Work only in the app repository. Do not commit unless the user asks.

## Detect the stack

Find the app root first. If the folder where the user asked is an app of a
supported stack, it is the app root. Else, it is the folder whose manifest
holds the framework dependency: in a monorepo, a member package. Run every
command of this skill in the app root.

| Found                                       | Stack                                                        |
| ------------------------------------------- | ------------------------------------------------------------ |
| `package.json` with `react` as a dependency | `react`                                                      |
| `pubspec.yaml` with the `flutter` SDK       | `flutter`                                                    |
| Anything else                               | Stop. Print what was found and the list of supported stacks. |

Your stack file is `references/stacks/<stack>.md`. Every stack file has the
same nine headings: Detect, Install, Catalog, Session, Model client, Mount,
Key, Flow test, Traps.

## Placements

| Placement | Shows                                                         | File                               |
| --------- | ------------------------------------------------------------- | ---------------------------------- |
| `inline`  | cards in a conversation                                       | `references/placements/inline.md`  |
| `sidebar` | a side panel whose controls follow the user's current task    | `references/placements/sidebar.md` |
| `home`    | a region at the top of the first screen, arranged by the date | `references/placements/home.md`    |

## Step 0: Preflight

1. If `a2ui.blueprint.json` exists at the app root, this skill ran here
   before. Do not install again, and skip item 2: the changes in the tree
   are from that run. Read the blueprint, and resume at the first step
   whose check fails, else at the first `pending` flow of step 5.
2. Run `git status --porcelain`. If it prints a line, stop, and ask the
   user to commit or stash first.
3. Read the Detect heading of your stack file, and run its command.
4. Tell the user what you found and the plan: the stack, the app root, a
   blueprint of 3 flows, at most 5 fix rounds for each flow, then a short
   summary. Wait for a yes.
5. Read the Install heading. Keep each SDK that the app already has, at its
   version. Install each missing one with the app's package manager, at the
   versions that the user gave, else the current versions. If your shell
   has no network access, ask the user first. Then read the installed
   README of each A2UI package and the guides of the Sources line.

Stop: on an unknown stack, a dirty working tree, a no from the user, or an
install that fails. Do not force an install.

## Step 1: Blueprint

Read `references/blueprint.md` now, then the Use heading of each placement
file and the Flow test heading of your stack file.

1. Propose 3 flows from the app's screens and data, each with a placement
   and a trigger. Write `a2ui.blueprint.json` at the app root, with the
   installed SDK versions.
2. Show the user each flow: where it shows, what starts it, the surface,
   and the data that it reads. Make the changes that the user asks for, and
   wait for a yes.

Stop: if the app has no data that a read tool can reach.

## Step 2: Catalog

Read `references/catalog.md` now, then the Catalog heading of your stack
file, and make the app catalog. If a component needs an SDK feature that
does not exist, leave it out, note the gap, and use another component.

Check: the build check of the Install heading exits 0.

## Step 3: Session and model client

Read `references/model-client.md` now, then the Session and Model client
headings of your stack file.

1. Write the session in the app, outside each view, as the Session heading
   says. A remount of a view then makes no new request. It has two modes:
   - Per request (`inline`): each answer gets a new surface.
   - Standing slot (`sidebar`, `home`): the session keeps the newest
     complete surface of each target. Each generation gets its own surface
     id. The old surface goes when the new answer is complete. A failed or
     cut-off answer leaves the old content. The session drops a reply for a
     context key that is no longer current.
2. The host writes its values into the data model of a standing surface
   with the data model API of the SDK, with no request and no message.
   When an answer is complete, the host writes its values again: they win
   over the first values that the model wrote.
3. Write the app's instructions, the model client and its read tools, as
   `references/model-client.md` says.

Check: the build check exits 0. A search of your files for `createSurface`,
`updateComponents` and `updateDataModel` finds nothing: the SDK makes these.

## Step 4: Key

Read the Key section and "When the model is unavailable" of
`references/model-client.md` now, then the Key heading of your stack file.

1. Add a key entry to the app's settings screen or drawer, so that each
   user brings their own Gemini key. Store the key as the Key heading says.
2. If the user's key is in `GEMINI_API_KEY`, run the ping of "When the
   model is unavailable" once.

Check: if the key is in `GEMINI_API_KEY`, the key check command of the Key
heading exits 0.

## Step 5: Flows

Read `references/flows.md` now, then the Record part of the Flow test
heading of your stack file.

Do this for each flow of the blueprint, in order:

1. Read the placement file of the flow, then the Mount and Flow test
   headings of your stack file. Mount the surface in the app's container.
2. For the first flow only: write the core test of `references/flows.md`.
   It must pass before the first recording. If it fails 5 times with the
   same cause, stop: it is an SDK gap.
3. Record the flow's fixture from a live run, or write it by hand, as
   `references/flows.md` says. Then run the key check.
4. Write the flow's test, with the cases of the Test heading of the
   placement file.
5. Run the flow's `test_command` three times in a row, in the app root,
   exactly as the blueprint has it. The flow passes only when all three
   runs exit 0.
6. If a run fails, that is one round: add 1 to `rounds_used`, find the
   cause, fix it, and do item 5 again. After the fifth failed round, set
   the status to `failed`, write the cause in one sentence in `cause`, and
   go to the next flow. Never start a sixth round.
7. When the flow passes, set its status to `success`. Then run the
   `test_command` of each earlier flow whose status is `success` once, to
   find regressions. A failure there is a round of that earlier flow. Fix
   it before you go on.

## Step 6: Finish

Start this step only when no flow is `pending`. Else go back to step 5.

1. The live check: if the ping of step 4 returned `200`, ask the user to
   start the app, enter their key in the app, start the first `success`
   flow, and say what shows.
2. Tell the user:
   - which flows work and where they show, and which failed and why,
   - the stack and the SDK versions that you used,
   - the files that you added and changed, and the test command,
   - each SDK gap as one line: the SDK and its version, what you expected,
     and what happened. Do not file it,
   - if a flow is `home`: the home placement makes one model request for
     each app start.
