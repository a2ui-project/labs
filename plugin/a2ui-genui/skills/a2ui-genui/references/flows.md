# Flows: record, test, fix

Each flow of the blueprint gets a recording, a test that replays it, and a
fix loop with a cap. Only the record test calls a model.

## Record

A fixture is the record of one live run of the flow. It starts with the
request that the flow sends:

```json
{"request": "<the typed prompt, or the host-built turn>", "...": "the model's replies"}
```

The Flow test heading of the stack file gives the second field and what a
replay puts in the model's place. Apart from that turn, a fixture holds
only what the model sent: no HTTP request, no header and no key.

Record only after the core test passes.

1. Write the record test as the Flow test heading says. It runs the app
   against the live model, and writes the fixture. If a turn fails, the
   record test fails, prints the error entries, and writes no fixture. It
   stops at the first error entry.
2. Start the flow by its trigger, exactly as the blueprint has it. Wait
   until the busy signal of the container ends.
3. Do the flow's action, if it has one, and wait for the answer.
4. Read the fixture. Each component of `expected_surface` must be in a
   reply. If one is missing, the cause is the instructions, the brief of
   the placement or the catalog.
5. Keep the record test. It skips without the record key, so a new
   recording is one command.

A live recording uses the user's quota. If a recording fails, fix its
cause in the instructions, the catalog, the read tools or the client code,
and record again. After two failed recordings of a flow, or after one
that fails with a quota, overload or network error, write the fixture by
hand.

If the user gave no key, or the model cannot answer (see "When the model is
unavailable" in `references/model-client.md`), write the fixture by hand,
in the syntax of the system prompt that the session sends. Use the app's
real data: the result of the read tool for the flow. The Flow test heading
says how to get it without a model. A flow that passes with a hand-written
fixture proves the app code, not a live turn. Say so in your last message.

A fixture is the model's answer, not your wish. Do not edit a recorded
reply to make a test pass.

The model gives a different reply in each recording: other labels,
component ids and order. So that a test does not change after each
recording, write in the instructions what must stay the same: each button
label, each event name and the shape of its context. Assert these, and the
values of the app's data. Do not assert other text of the model.

## The flow test

The Flow test heading of the stack file says how the test replaces the
model, and what it can read. The placement file adds its own cases.

1. Start the app with the flow's fixture in the model's place.
2. Start the flow by its trigger.
3. Assert that each component of `expected_surface` shows on the surface.
   Assert each value of the app's data on the surface against the result
   of the read tool, not against text that you copy from the fixture.
4. If the flow has an action: fill the inputs, press the button, and assert
   the exact action turn that the model receives. Then assert the surface
   that the next reply leaves. If the action writes, assert the write's
   effect in the app. One press must give one write, so assert the effect
   once, not "at least once".
5. Assert that there are no error entries and, where the stack can see
   them, no console errors.
6. The read tool check: compare the result of each read tool of the flow
   with what the app's own screen shows, or with the app's data function.
   This check fails when the tool returns a wrong value. If it passes and a
   value on the surface differs, the model changed the value: that
   recording failed.

## The core test

The core test is one test file with a hand-written fixture. It runs in the
placement of the first flow. It proves the session and the mount before a
flow uses a request. Give it these cases:

1. A surface with an app component shows beside basic components, and the
   system prompt that the model received starts with the app's
   instructions and names each app component.
2. An action round trip: fill an input, press the button, assert the exact
   action turn that the model received, and the surface that an
   `update=true` reply leaves.
3. The read tool check of "The flow test", for one read tool.
4. A reply whose first block the SDK rejects, such as a component that is
   not in the catalog: the model receives one error turn, and the rest of
   the reply shows.

The Traps heading of the stack file says which case finds which trap.

## A fix round

Step 5 of `SKILL.md` gives the loop: three runs in a row, at most 5 rounds,
and the regression runs. In each round:

1. Read the failure, and find its cause: the app code, the instructions,
   the brief, the catalog, the fixture or the test.
2. Make one change for that cause. If the change is in the test, it must
   make the test assert the blueprint's flow more exactly, not less.

Set a flow to `failed` before the fifth round only when it cannot go on
without the user or an upstream fix: data that a test cannot have, or an
SDK gap. A missing key, a quota or a failed recording is not such a cause:
the fix is a hand-written fixture.
